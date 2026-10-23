import express from "express";
import { Types } from "mongoose";
import { AgentRunModel } from "../models/agent-run.model.js";
import { WorkOrderModel } from "../models/work-order.model.js";
import { AssignmentModel } from "../models/assignment.model.js";
import { VisitModel } from "../models/visit.model.js";
import { NotificationModel } from "../models/notification.model.js";
import { authenticateSession } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/authorize.middleware.js";
import { runSchedulingAgent } from "../services/scheduling-agent.service.js";
import { logAuditEvent } from "../services/audit.service.js";

export const schedulingAgentRouter = express.Router();

schedulingAgentRouter.use(authenticateSession);

/**
 * POST /api/scheduling-agent
 * Generates an auditable scheduling proposal through the bounded agent workflow.
 * DOES NOT mutate live schedules or work orders.
 */
schedulingAgentRouter.post(
  "/",
  requireRole("property_manager", "admin"),
  async (req, res) => {
    const { propertyId, instruction } = req.body;

    if (!propertyId || !Types.ObjectId.isValid(propertyId)) {
      const error = new Error("Valid Property ID is required for scheduling agent.");
      error.statusCode = 400;
      throw error;
    }

    // Verify manager scope
    const isAuthorized = req.user.propertyScope?.some(
      (p) => p.toString() === propertyId.toString(),
    );
    if (!isAuthorized && req.user.role !== "admin") {
      const error = new Error("Forbidden: You cannot schedule work for a property outside your scope.");
      error.statusCode = 403;
      throw error;
    }

    const proposal = await runSchedulingAgent({
      propertyId,
      managerUserId: req.user._id,
      userInstruction: instruction || "Arrange next week's non-emergency maintenance visits.",
    });

    await logAuditEvent({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "SCHEDULING_PROPOSAL_GENERATED",
      propertyId,
      resourceType: "AgentRun",
      description: `Generated scheduling proposal ${proposal.proposalId} (${proposal.proposedVisits.length} visits proposed)`,
      req,
    });

    res.status(200).json({
      success: true,
      message: "Scheduling proposal generated successfully for manager review.",
      data: proposal,
    });
  },
);

/**
 * POST /api/scheduling-agent/confirm
 * Manager explicitly approves the proposal.
 * Re-validates current availability, atomically reserves slots, and dispatches notifications.
 */
schedulingAgentRouter.post(
  "/confirm",
  requireRole("property_manager", "admin"),
  async (req, res) => {
    const { proposalId, selectedVisits } = req.body;

    if (!proposalId) {
      const error = new Error("Proposal ID is required for confirmation.");
      error.statusCode = 400;
      throw error;
    }

    const agentRun = await AgentRunModel.findOne({ proposalId });
    if (!agentRun) {
      const error = new Error("Proposal not found.");
      error.statusCode = 404;
      throw error;
    }

    if (agentRun.status === "confirmed") {
      const error = new Error("This proposal has already been confirmed. Duplicate confirmation prevented.");
      error.statusCode = 409;
      throw error;
    }

    // Manager property authorization re-check
    const isAuthorized = req.user.propertyScope?.some(
      (p) => p.toString() === agentRun.propertyId.toString(),
    );
    if (!isAuthorized && req.user.role !== "admin") {
      const error = new Error("Forbidden: Property is outside your management scope.");
      error.statusCode = 403;
      throw error;
    }

    const visitsToCommit =
      Array.isArray(selectedVisits) && selectedVisits.length > 0
        ? selectedVisits
        : agentRun.proposalData?.visits || [];

    if (visitsToCommit.length === 0) {
      const error = new Error("No feasible visits to confirm in this proposal.");
      error.statusCode = 400;
      throw error;
    }

    const committedVisits = [];
    const collisionErrors = [];

    // Atomically validate and commit each visit
    for (const item of visitsToCommit) {
      const { workOrderId, technicianId, proposedStartTime, proposedEndTime } = item;
      const startTime = new Date(proposedStartTime);
      const endTime = new Date(proposedEndTime);

      // Concurrency check: verify no overlapping confirmed visits appeared in the interim
      const conflict = await VisitModel.findOne({
        technicianId: new Types.ObjectId(technicianId),
        status: "confirmed",
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
      });

      if (conflict) {
        collisionErrors.push(
          `Technician double-booking collision detected for work order ${item.reference || workOrderId} at ${proposedStartTime}. Confirmation aborted for this slot.`,
        );
        continue;
      }

      const order = await WorkOrderModel.findById(workOrderId);
      if (!order) continue;

      // Find or create assignment
      let assignment = await AssignmentModel.findOne({
        workOrderId: order._id,
        technicianId: new Types.ObjectId(technicianId),
      });

      if (!assignment) {
        const technicianUser = await (await import("../models/user.model.js")).UserModel.findById(technicianId);
        assignment = await AssignmentModel.create({
          workOrderId: order._id,
          propertyId: order.propertyId,
          vendorId: technicianUser.vendorId || order.propertyId,
          technicianId: new Types.ObjectId(technicianId),
          status: "scheduled",
          assignedBy: req.user._id,
          confirmedVisit: {
            start: startTime,
            end: endTime,
            confirmedAt: new Date(),
            confirmedBy: req.user._id,
          },
        });
      } else {
        assignment.status = "scheduled";
        assignment.confirmedVisit = {
          start: startTime,
          end: endTime,
          confirmedAt: new Date(),
          confirmedBy: req.user._id,
        };
        await assignment.save();
      }

      // Create confirmed Visit record
      const visit = await VisitModel.create({
        workOrderId: order._id,
        assignmentId: assignment._id,
        propertyId: order.propertyId,
        technicianId: new Types.ObjectId(technicianId),
        residentId: order.residentId,
        startTime,
        endTime,
        status: "confirmed",
        proposalId,
      });

      committedVisits.push(visit);

      // Transition work order status to "Scheduled"
      order.currentAssignmentId = assignment._id;
      order.status = "Scheduled";
      order.timeline.push({
        status: "Scheduled",
        changedBy: req.user._id,
        role: req.user.role,
        timestamp: new Date(),
        notes: `Visit confirmed for ${startTime.toLocaleString()} - ${endTime.toLocaleString()}`,
      });
      await order.save();

      // Dispatch notifications ONLY upon successful commit
      await NotificationModel.create({
        recipientId: order.residentId,
        eventType: "schedule_confirmed",
        title: "Maintenance Visit Scheduled",
        message: `A maintenance visit for ${order.reference} has been scheduled for ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}.`,
        relatedResourceType: "Visit",
        relatedResourceId: visit._id,
      });

      await NotificationModel.create({
        recipientId: new Types.ObjectId(technicianId),
        eventType: "schedule_confirmed",
        title: "Visit Added to Your Schedule",
        message: `Confirmed visit for job ${order.reference} on ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}.`,
        relatedResourceType: "Visit",
        relatedResourceId: visit._id,
      });
    }

    if (committedVisits.length === 0) {
      const error = new Error(`Failed to commit schedule: ${collisionErrors.join("; ")}`);
      error.statusCode = 409;
      throw error;
    }

    agentRun.status = "confirmed";
    agentRun.confirmedAt = new Date();
    agentRun.confirmedBy = req.user._id;
    await agentRun.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "SCHEDULE_CONFIRMED",
      propertyId: agentRun.propertyId,
      resourceType: "AgentRun",
      resourceId: agentRun._id,
      description: `Manager confirmed schedule proposal ${proposalId} (${committedVisits.length} visits committed)`,
      req,
    });

    res.status(200).json({
      success: true,
      message: `Schedule confirmed. ${committedVisits.length} visits committed successfully.`,
      data: {
        proposalId,
        committedCount: committedVisits.length,
        collisions: collisionErrors,
      },
    });
  },
);
