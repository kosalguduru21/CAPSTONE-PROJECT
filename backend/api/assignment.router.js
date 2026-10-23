import express from "express";
import { Types } from "mongoose";
import { AssignmentModel } from "../models/assignment.model.js";
import { WorkOrderModel } from "../models/work-order.model.js";
import { NotificationModel } from "../models/notification.model.js";
import { authenticateSession } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/authorize.middleware.js";
import { uploadMiddleware } from "../middlewares/multer.middleware.js";
import { logAuditEvent } from "../services/audit.service.js";

export const assignmentRouter = express.Router();

assignmentRouter.use(authenticateSession);

/**
 * GET /api/assignments
 * Vendor technician views only their currently assigned, active jobs.
 */
assignmentRouter.get("/", async (req, res) => {
  const filter = {};

  if (req.user.role === "vendor_technician") {
    filter.technicianId = req.user._id;
    filter.status = { $ne: "expired" };
    filter.retentionExpiresAt = { $gt: new Date() };
  } else if (req.user.role === "property_manager") {
    filter.propertyId = { $in: req.user.propertyScope || [] };
  }

  const assignments = await AssignmentModel.find(filter)
    .populate({
      path: "workOrderId",
      populate: [
        { path: "unitId", select: "unitNumber floor" },
        { path: "buildingId", select: "name code" },
      ],
    })
    .populate("vendorId", "name contactEmail phone")
    .populate("technicianId", "name email phone")
    .sort({ assignedAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: {
      assignments,
    },
  });
});

/**
 * GET /api/assignments/:id
 */
assignmentRouter.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid assignment ID");
    error.statusCode = 400;
    throw error;
  }

  const assignment = await AssignmentModel.findById(id)
    .populate({
      path: "workOrderId",
      populate: [
        { path: "unitId", select: "unitNumber floor accessInstructions" },
        { path: "buildingId", select: "name code address" },
      ],
    })
    .populate("vendorId", "name contactEmail phone")
    .populate("technicianId", "name email phone")
    .lean();

  if (!assignment) {
    const error = new Error("Assignment not found");
    error.statusCode = 404;
    throw error;
  }

  // Authorization check
  if (
    req.user.role === "vendor_technician" &&
    assignment.technicianId?._id?.toString() !== req.user._id.toString()
  ) {
    const error = new Error("Forbidden: You cannot view another technician's assignment.");
    error.statusCode = 403;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: {
      assignment,
    },
  });
});

/**
 * PATCH /api/assignments/:id/progress
 * Update progress with permitted status transitions.
 */
assignmentRouter.patch(
  "/:id/progress",
  requireRole("vendor_technician", "property_manager", "admin"),
  async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    const allowedTransitions = [
      "assigned",
      "proposed",
      "scheduled",
      "in_progress",
      "completed",
    ];

    if (!allowedTransitions.includes(status)) {
      const error = new Error(`Invalid status transition: ${status}`);
      error.statusCode = 400;
      throw error;
    }

    const assignment = await AssignmentModel.findById(id);
    if (!assignment) {
      const error = new Error("Assignment not found");
      error.statusCode = 404;
      throw error;
    }

    if (
      req.user.role === "vendor_technician" &&
      assignment.technicianId.toString() !== req.user._id.toString()
    ) {
      const error = new Error("Forbidden: You can only update your own assignment.");
      error.statusCode = 403;
      throw error;
    }

    assignment.status = status;
    assignment.progressRecords.push({
      status,
      notes: notes || `Technician updated progress to ${status}`,
      timestamp: new Date(),
      recordedBy: req.user._id,
    });
    await assignment.save();

    // Sync status with parent work order
    const order = await WorkOrderModel.findById(assignment.workOrderId);
    if (order) {
      if (status === "in_progress") {
        order.status = "In Progress";
        order.timeline.push({
          status: "In Progress",
          changedBy: req.user._id,
          role: req.user.role,
          timestamp: new Date(),
          notes: notes || "Work begun by technician.",
        });
        await order.save();
      }
    }

    await logAuditEvent({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "ASSIGNMENT_PROGRESS_UPDATED",
      propertyId: assignment.propertyId,
      resourceType: "Assignment",
      resourceId: assignment._id,
      description: `Technician updated assignment ${assignment._id} to ${status}`,
      req,
    });

    res.status(200).json({
      success: true,
      message: "Progress updated successfully.",
      data: {
        assignment,
      },
    });
  },
);

/**
 * POST /api/assignments/:id/completion
 * Vendor submits completion notes and evidence.
 * Transitions parent work order to "Work Completed — Awaiting Review" (NOT auto-resolved).
 */
assignmentRouter.post(
  "/:id/completion",
  requireRole("vendor_technician", "property_manager", "admin"),
  uploadMiddleware.array("evidenceFiles", 5),
  async (req, res) => {
    const { id } = req.params;
    const { completionNotes, followUpWorkRequired } = req.body;

    if (!completionNotes || completionNotes.trim().length < 5) {
      const error = new Error("Detailed completion notes are required.");
      error.statusCode = 400;
      throw error;
    }

    const assignment = await AssignmentModel.findById(id);
    if (!assignment) {
      const error = new Error("Assignment not found");
      error.statusCode = 404;
      throw error;
    }

    if (
      req.user.role === "vendor_technician" &&
      assignment.technicianId.toString() !== req.user._id.toString()
    ) {
      const error = new Error("Forbidden: You can only complete your own assignment.");
      error.statusCode = 403;
      throw error;
    }

    const uploadedEvidence = (req.files || []).map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/api/work-orders/files/${file.filename}`,
      uploadedAt: new Date(),
    }));

    assignment.status = "completed";
    assignment.progressRecords.push({
      status: "completed",
      notes: completionNotes.trim(),
      timestamp: new Date(),
      recordedBy: req.user._id,
    });
    await assignment.save();

    // Critical Requirement: DO NOT auto-resolve work order. Move to "Work Completed — Awaiting Review"
    const order = await WorkOrderModel.findById(assignment.workOrderId);
    if (order) {
      order.status = "Work Completed — Awaiting Review";
      order.completionNotes = completionNotes.trim();
      if (uploadedEvidence.length > 0) {
        order.completionEvidence.push(...uploadedEvidence);
      }
      order.timeline.push({
        status: "Work Completed — Awaiting Review",
        changedBy: req.user._id,
        role: req.user.role,
        timestamp: new Date(),
        notes: `Work completed by technician. Awaiting resident/manager review. ${followUpWorkRequired ? "Follow-up noted." : ""}`,
      });
      await order.save();

      // Notify resident that work is completed and ready for their review
      await NotificationModel.create({
        recipientId: order.residentId,
        eventType: "work_completed",
        title: "Work Completed on Your Request",
        message: `Technician completed work on ${order.reference}. Please review and confirm resolution.`,
        relatedResourceType: "WorkOrder",
        relatedResourceId: order._id,
      });
    }

    await logAuditEvent({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "WORK_COMPLETED_SUBMITTED",
      propertyId: assignment.propertyId,
      resourceType: "Assignment",
      resourceId: assignment._id,
      description: `Completion submitted for WO ${order?.reference}`,
      req,
    });

    res.status(200).json({
      success: true,
      message: "Completion notes and evidence submitted. Awaiting resident review.",
      data: {
        assignment,
        workOrder: order,
      },
    });
  },
);
