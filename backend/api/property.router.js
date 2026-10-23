import express from "express";
import crypto from "crypto";
import { Types } from "mongoose";
import { PropertyModel } from "../models/property.model.js";
import { BuildingModel } from "../models/building.model.js";
import { UnitModel } from "../models/unit.model.js";
import { WorkOrderModel } from "../models/work-order.model.js";
import { VisitModel } from "../models/visit.model.js";
import { InvitationModel } from "../models/invitation.model.js";
import { UserModel } from "../models/user.model.js";
import { authenticateSession, generateSecureToken } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/authorize.middleware.js";
import { logAuditEvent } from "../services/audit.service.js";

export const propertyRouter = express.Router();

propertyRouter.use(authenticateSession);

/**
 * GET /api/properties
 * List properties accessible to user.
 */
propertyRouter.get("/", async (req, res) => {
  let filter = { status: "active" };

  if (req.user.role === "property_manager") {
    filter._id = { $in: req.user.propertyScope || [] };
  } else if (req.user.role === "resident" && req.user.residentPropertyId) {
    filter._id = req.user.residentPropertyId;
  }

  const properties = await PropertyModel.find(filter).lean();

  res.status(200).json({
    success: true,
    data: {
      properties,
    },
  });
});

/**
 * GET /api/properties/:id/buildings
 */
propertyRouter.get("/:id/buildings", async (req, res) => {
  const { id } = req.params;

  const buildings = await BuildingModel.find({ propertyId: id, status: "active" }).lean();

  res.status(200).json({
    success: true,
    data: {
      buildings,
    },
  });
});

/**
 * GET /api/properties/:id/units
 */
propertyRouter.get("/:id/units", async (req, res) => {
  const { id } = req.params;
  const { buildingId } = req.query;

  const filter = { propertyId: id };
  if (buildingId) filter.buildingId = buildingId;

  // Protect private unit details from unauthorized cross-resident inspection
  let selectFields = "unitNumber floor status buildingId";
  if (req.user.role === "property_manager" || req.user.role === "admin") {
    selectFields += " accessInstructions residentIds";
  }

  const units = await UnitModel.find(filter)
    .populate("buildingId", "name code")
    .select(selectFields)
    .lean();

  res.status(200).json({
    success: true,
    data: {
      units,
    },
  });
});

/**
 * GET /api/properties/:id/dashboard-metrics
 * Deterministically computes operational statistics from live stored records.
 */
propertyRouter.get(
  "/:id/dashboard-metrics",
  requireRole("property_manager", "admin"),
  async (req, res) => {
    const { id } = req.params;

    const propertyId = new Types.ObjectId(id);

    // Compute live metrics from work order collections
    const [
      totalOpen,
      newUnderReview,
      highPriorityOverdue,
      awaitingApproval,
      scheduledVisits,
      inProgress,
      awaitingReview,
      reopened,
      resolvedOrders,
    ] = await Promise.all([
      WorkOrderModel.countDocuments({
        propertyId,
        status: { $nin: ["Resolved", "Cancelled", "Rejected"] },
      }),
      WorkOrderModel.countDocuments({
        propertyId,
        status: { $in: ["Submitted", "Under Review"] },
      }),
      WorkOrderModel.countDocuments({
        propertyId,
        priority: { $in: ["high", "emergency"] },
        status: { $nin: ["Resolved", "Cancelled", "Rejected"] },
      }),
      WorkOrderModel.countDocuments({
        propertyId,
        status: { $in: ["Awaiting Estimate", "Awaiting Approval"] },
      }),
      VisitModel.countDocuments({
        propertyId,
        status: "confirmed",
        startTime: { $gte: new Date() },
      }),
      WorkOrderModel.countDocuments({
        propertyId,
        status: "In Progress",
      }),
      WorkOrderModel.countDocuments({
        propertyId,
        status: "Work Completed — Awaiting Review",
      }),
      WorkOrderModel.countDocuments({
        propertyId,
        status: "Reopened",
      }),
      WorkOrderModel.find({
        propertyId,
        status: "Resolved",
        resolvedAt: { $ne: null },
      }).select("createdAt resolvedAt"),
    ]);

    // Calculate real average resolution time in hours
    let avgResolutionHours = null;
    if (resolvedOrders.length > 0) {
      const totalHours = resolvedOrders.reduce((sum, order) => {
        const diffMs = new Date(order.resolvedAt) - new Date(order.createdAt);
        return sum + diffMs / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = Math.round((totalHours / resolvedOrders.length) * 10) / 10;
    }

    res.status(200).json({
      success: true,
      data: {
        totalOpenWorkOrders: totalOpen,
        newRequestsAwaitingReview: newUnderReview,
        highPriorityAndEmergencyJobs: highPriorityOverdue,
        jobsAwaitingEstimatesOrApproval: awaitingApproval,
        scheduledVisitsCount: scheduledVisits,
        workInProgress: inProgress,
        completedAwaitingResidentReview: awaitingReview,
        reopenedJobs: reopened,
        averageResolutionHours: avgResolutionHours,
        totalResolvedHistorical: resolvedOrders.length,
      },
    });
  },
);

/**
 * POST /api/properties/:id/invitations
 * Manager generates scoped invitations for new residents or technicians.
 */
propertyRouter.post(
  "/:id/invitations",
  requireRole("property_manager", "admin"),
  async (req, res) => {
    const { id } = req.params;
    const { email, role, unitId, vendorId } = req.body;

    if (!email || !role) {
      const error = new Error("Email and intended role are required.");
      error.statusCode = 400;
      throw error;
    }

    const token = generateSecureToken(24);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await InvitationModel.create({
      email: email.trim().toLowerCase(),
      token,
      role,
      propertyId: new Types.ObjectId(id),
      unitId: unitId && Types.ObjectId.isValid(unitId) ? new Types.ObjectId(unitId) : null,
      vendorId: vendorId && Types.ObjectId.isValid(vendorId) ? new Types.ObjectId(vendorId) : null,
      invitedBy: req.user._id,
      expiresAt,
    });

    await logAuditEvent({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "INVITATION_CREATED",
      propertyId: id,
      resourceType: "Invitation",
      resourceId: invitation._id,
      description: `Invited ${email} with role ${role}`,
      req,
    });

    res.status(201).json({
      success: true,
      message: "Invitation created.",
      data: {
        invitationToken: token,
        inviteLink: `${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/register?token=${token}`,
        expiresAt,
      },
    });
  },
);
