import express from "express";
import { Types } from "mongoose";
import { WorkOrderModel } from "../models/work-order.model.js";
import { authenticateSession } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/authorize.middleware.js";
import { findRelatedWorkOrders } from "../services/related-case-search.service.js";
import { logAuditEvent } from "../services/audit.service.js";

export const relatedCaseRouter = express.Router();

relatedCaseRouter.use(authenticateSession);

/**
 * GET /api/related-cases/:workOrderId
 * Property manager investigates potentially related reports within the authorized property.
 */
relatedCaseRouter.get(
  "/:workOrderId",
  requireRole("property_manager", "admin"),
  async (req, res) => {
    const { workOrderId } = req.params;

    if (!Types.ObjectId.isValid(workOrderId)) {
      const error = new Error("Invalid Work Order ID");
      error.statusCode = 400;
      throw error;
    }

    const targetOrder = await WorkOrderModel.findById(workOrderId);
    if (!targetOrder) {
      const error = new Error("Work order not found");
      error.statusCode = 404;
      throw error;
    }

    // Verify manager property scope
    const isAuthorized = req.user.propertyScope?.some(
      (p) => p.toString() === targetOrder.propertyId.toString(),
    );
    if (!isAuthorized && req.user.role !== "admin") {
      const error = new Error("Forbidden: This work order is outside your management scope.");
      error.statusCode = 403;
      throw error;
    }

    const matches = await findRelatedWorkOrders(
      targetOrder._id,
      targetOrder.propertyId,
      {
        limit: 5,
        minSimilarity: 0.5,
      },
    );

    res.status(200).json({
      success: true,
      data: {
        workOrderId: targetOrder._id,
        reference: targetOrder.reference,
        title: targetOrder.title,
        category: targetOrder.category,
        relatedCases: matches,
        markedDecisions: targetOrder.relatedCases || [],
      },
    });
  },
);

/**
 * POST /api/related-cases/:workOrderId/mark
 * Manager records a decision marking a case as related or unrelated.
 */
relatedCaseRouter.post(
  "/:workOrderId/mark",
  requireRole("property_manager", "admin"),
  async (req, res) => {
    const { workOrderId } = req.params;
    const { relatedOrderId, similarityScore, notes, isDismissed } = req.body;

    if (!Types.ObjectId.isValid(workOrderId) || !Types.ObjectId.isValid(relatedOrderId)) {
      const error = new Error("Valid workOrderId and relatedOrderId are required");
      error.statusCode = 400;
      throw error;
    }

    const order = await WorkOrderModel.findById(workOrderId);
    if (!order) {
      const error = new Error("Work order not found");
      error.statusCode = 404;
      throw error;
    }

    // Remove existing mark for this related case if present
    order.relatedCases = order.relatedCases.filter(
      (rc) => rc.workOrderId.toString() !== relatedOrderId.toString(),
    );

    order.relatedCases.push({
      workOrderId: new Types.ObjectId(relatedOrderId),
      similarityScore: similarityScore || 0.8,
      notes: notes || (isDismissed ? "Marked as unrelated by manager." : "Marked as related incident by manager."),
      markedBy: req.user._id,
      markedAt: new Date(),
      isDismissed: !!isDismissed,
    });

    await order.save();

    await logAuditEvent({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: isDismissed ? "RELATED_CASE_DISMISSED" : "RELATED_CASE_LINKED",
      propertyId: order.propertyId,
      resourceType: "WorkOrder",
      resourceId: order._id,
      description: `Manager ${req.user.name} marked WO ${relatedOrderId} as ${isDismissed ? "unrelated" : "related"} to ${order.reference}`,
      req,
    });

    res.status(200).json({
      success: true,
      message: `Case successfully marked as ${isDismissed ? "unrelated" : "related"}.`,
      data: {
        relatedCases: order.relatedCases,
      },
    });
  },
);
