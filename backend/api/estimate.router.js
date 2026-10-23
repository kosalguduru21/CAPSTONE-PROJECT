import express from "express";
import { Types } from "mongoose";
import { EstimateModel } from "../models/estimate.model.js";
import { WorkOrderModel } from "../models/work-order.model.js";
import { AssignmentModel } from "../models/assignment.model.js";
import { NotificationModel } from "../models/notification.model.js";
import { authenticateSession } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/authorize.middleware.js";
import { logAuditEvent } from "../services/audit.service.js";
import { createEstimateSchema } from "../validators/estimate.validator.js";

export const estimateRouter = express.Router();

estimateRouter.use(authenticateSession);

/**
 * POST /api/estimates
 * Vendor submits an itemized estimate.
 * All totals and taxes are calculated deterministically on the server.
 */
estimateRouter.post(
  "/",
  requireRole("vendor_technician", "property_manager", "admin"),
  async (req, res) => {
    const parsed = createEstimateSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error(parsed.error.errors[0].message);
      error.statusCode = 400;
      throw error;
    }

    const {
      workOrderId,
      assignmentId,
      lineItems,
      laborCost = 0,
      materialCost = 0,
      taxAmount = 0,
      currency = "USD",
      exclusions,
      assumptions,
      validDays = 30,
    } = parsed.data;

    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment) {
      const error = new Error("Associated assignment not found");
      error.statusCode = 404;
      throw error;
    }

    if (
      req.user.role === "vendor_technician" &&
      assignment.technicianId.toString() !== req.user._id.toString()
    ) {
      const error = new Error("Forbidden: You can only submit estimates for your own assignments.");
      error.statusCode = 403;
      throw error;
    }

    const order = await WorkOrderModel.findById(workOrderId);
    if (!order) {
      const error = new Error("Work order not found");
      error.statusCode = 404;
      throw error;
    }

    // Deterministic server-side calculations
    let calculatedLineItemsSubtotal = 0;
    const itemizedList = lineItems.map((item) => {
      const lineTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
      calculatedLineItemsSubtotal += lineTotal;
      return {
        description: item.description.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: lineTotal,
      };
    });

    const subtotal = Math.round((calculatedLineItemsSubtotal + laborCost + materialCost) * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

    // Check if previous estimate exists to increment revision
    const latestEstimate = await EstimateModel.findOne({ workOrderId }).sort({ revision: -1 });
    const revision = latestEstimate ? latestEstimate.revision + 1 : 1;

    const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

    const estimate = await EstimateModel.create({
      workOrderId: order._id,
      assignmentId: assignment._id,
      vendorId: assignment.vendorId,
      technicianId: req.user._id,
      revision,
      lineItems: itemizedList,
      subtotal,
      laborCost,
      materialCost,
      taxAmount,
      totalAmount,
      currency,
      exclusions: exclusions || "Unforeseen internal wall pipe corrosion not included.",
      assumptions: assumptions || "Standard access to mains and breaker panel provided.",
      validUntil,
      decisionStatus: "pending",
      decisionHistory: [],
    });

    order.currentEstimateId = estimate._id;
    order.status = "Awaiting Approval";
    order.timeline.push({
      status: "Awaiting Approval",
      changedBy: req.user._id,
      role: req.user.role,
      timestamp: new Date(),
      notes: `Estimate Rev ${revision} submitted: $${totalAmount} ${currency}`,
    });
    await order.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "ESTIMATE_SUBMITTED",
      propertyId: order.propertyId,
      resourceType: "Estimate",
      resourceId: estimate._id,
      description: `Submitted Estimate Rev ${revision} for WO ${order.reference}: $${totalAmount}`,
      req,
    });

    res.status(201).json({
      success: true,
      message: "Estimate created successfully and sent for approval.",
      data: {
        estimate,
        workOrder: order,
      },
    });
  },
);

/**
 * GET /api/estimates/:workOrderId
 * Returns active estimate and previous revisions.
 */
estimateRouter.get("/:workOrderId", async (req, res) => {
  const { workOrderId } = req.params;

  if (!Types.ObjectId.isValid(workOrderId)) {
    const error = new Error("Invalid Work Order ID");
    error.statusCode = 400;
    throw error;
  }

  const order = await WorkOrderModel.findById(workOrderId);
  if (!order) {
    const error = new Error("Work order not found");
    error.statusCode = 404;
    throw error;
  }

  // Authorize
  if (req.user.role === "resident" && order.residentId.toString() !== req.user._id.toString()) {
    const error = new Error("Forbidden: Cannot view another resident's estimate.");
    error.statusCode = 403;
    throw error;
  }

  const estimates = await EstimateModel.find({ workOrderId })
    .populate("vendorId", "name contactEmail phone")
    .populate("technicianId", "name email")
    .populate("decisionHistory.decidedBy", "name role")
    .sort({ revision: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: {
      estimates,
      currentEstimate: estimates[0] || null,
    },
  });
});
