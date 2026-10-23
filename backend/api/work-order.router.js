import express from "express";
import crypto from "crypto";
import { Types } from "mongoose";
import { WorkOrderModel } from "../models/work-order.model.js";
import { AssignmentModel } from "../models/assignment.model.js";
import { EstimateModel } from "../models/estimate.model.js";
import { PropertyModel } from "../models/property.model.js";
import { UserModel } from "../models/user.model.js";
import { NotificationModel } from "../models/notification.model.js";
import { authenticateSession } from "../middlewares/auth.middleware.js";
import { requireRole, enforcePropertyScope } from "../middlewares/authorize.middleware.js";
import { uploadMiddleware } from "../middlewares/multer.middleware.js";
import { logAuditEvent } from "../services/audit.service.js";
import { indexWorkOrderEmbedding } from "../services/related-case-search.service.js";
import {
  createWorkOrderSchema,
  completionReviewSchema,
} from "../validators/work-order.validator.js";

export const workOrderRouter = express.Router();

workOrderRouter.use(authenticateSession);

/**
 * Generate human-readable work order reference.
 */
function generateReference() {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `WO-${year}-${randomSuffix}`;
}

/**
 * POST /api/work-orders
 * Resident creates maintenance request.
 */
workOrderRouter.post("/", async (req, res) => {
  const parsed = createWorkOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    const error = new Error(parsed.error.errors[0].message);
    error.statusCode = 400;
    throw error;
  }

  const {
    propertyId,
    unitId,
    buildingId,
    isSharedArea,
    sharedAreaIdentifier,
    category,
    title,
    description,
    priority,
    accessPreferences,
    preferredAccessWindows,
  } = parsed.data;

  // Authorization check: residents can only create requests for their own property & unit
  if (req.user.role === "resident") {
    if (
      req.user.residentPropertyId &&
      req.user.residentPropertyId.toString() !== propertyId.toString()
    ) {
      const error = new Error("You cannot submit requests for a property you do not reside in.");
      error.statusCode = 403;
      throw error;
    }

    if (!isSharedArea) {
      if (!unitId || (req.user.residentUnitId && req.user.residentUnitId.toString() !== unitId.toString())) {
        const error = new Error("Residents may only submit requests for their assigned unit or shared common areas.");
        error.statusCode = 403;
        throw error;
      }
    }
  }

  const reference = generateReference();

  const newWorkOrder = await WorkOrderModel.create({
    reference,
    propertyId: new Types.ObjectId(propertyId),
    buildingId: buildingId ? new Types.ObjectId(buildingId) : null,
    unitId: !isSharedArea && unitId ? new Types.ObjectId(unitId) : null,
    isSharedArea: !!isSharedArea,
    sharedAreaIdentifier: isSharedArea ? sharedAreaIdentifier || "Shared Area" : "",
    residentId: req.user._id,
    category,
    title,
    description,
    priority: priority || "normal",
    status: "Submitted",
    accessPreferences: accessPreferences || "Permission to enter during preferred windows.",
    preferredAccessWindows: preferredAccessWindows || [],
    timeline: [
      {
        status: "Submitted",
        changedBy: req.user._id,
        role: req.user.role,
        timestamp: new Date(),
        notes: "Work order submitted by resident.",
      },
    ],
  });

  // Asynchronously index semantic embedding for related-case search
  indexWorkOrderEmbedding(newWorkOrder).catch((err) =>
    console.warn("[Embedding index warn]", err.message),
  );

  await logAuditEvent({
    actorId: req.user._id,
    actorRole: req.user.role,
    action: "WORK_ORDER_CREATED",
    propertyId: newWorkOrder.propertyId,
    resourceType: "WorkOrder",
    resourceId: newWorkOrder._id,
    description: `Created work order ${newWorkOrder.reference}: ${newWorkOrder.title}`,
    req,
  });

  res.status(201).json({
    success: true,
    message: "Work order created successfully.",
    data: {
      workOrder: newWorkOrder,
    },
  });
});

/**
 * GET /api/work-orders
 * List work orders scoped strictly by role and property permissions.
 */
workOrderRouter.get("/", async (req, res) => {
  const { status, category, priority, propertyId, page = 1, limit = 20 } = req.query;

  const filter = {};

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;

  // Role Scoping
  if (req.user.role === "resident") {
    filter.residentId = req.user._id;
  } else if (req.user.role === "property_manager") {
    if (propertyId) {
      // Must be within manager's property scope
      if (
        !req.user.propertyScope?.some(
          (p) => p.toString() === propertyId.toString(),
        )
      ) {
        const error = new Error("Forbidden: Property is outside your management scope.");
        error.statusCode = 403;
        throw error;
      }
      filter.propertyId = propertyId;
    } else {
      filter.propertyId = { $in: req.user.propertyScope || [] };
    }
  } else if (req.user.role === "vendor_technician") {
    // Technician can only see work orders they are actively assigned to
    const myAssignments = await AssignmentModel.find({
      technicianId: req.user._id,
      status: { $in: ["assigned", "proposed", "scheduled", "in_progress", "completed"] },
      retentionExpiresAt: { $gt: new Date() },
    }).select("workOrderId");

    const assignedWorkOrderIds = myAssignments.map((a) => a.workOrderId);
    filter._id = { $in: assignedWorkOrderIds };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await WorkOrderModel.countDocuments(filter);

  const workOrders = await WorkOrderModel.find(filter)
    .populate("unitId", "unitNumber")
    .populate("buildingId", "name code")
    .populate("residentId", "name email phone")
    .populate("currentAssignmentId")
    .populate("currentEstimateId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Protect resident private access instructions and personal details from vendor technicians
  if (req.user.role === "vendor_technician") {
    workOrders.forEach((order) => {
      if (order.residentId) {
        order.residentId = { name: order.residentId.name }; // Strip phone & email
      }
    });
  }

  res.status(200).json({
    success: true,
    data: {
      workOrders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * GET /api/work-orders/:id
 * Retrieve work order details after verifying role authorization.
 */
workOrderRouter.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid Work Order ID");
    error.statusCode = 400;
    throw error;
  }

  const order = await WorkOrderModel.findById(id)
    .populate("propertyId", "name address spendingRules timezone emergencyContacts")
    .populate("unitId", "unitNumber floor accessInstructions")
    .populate("buildingId", "name code")
    .populate("residentId", "name email phone")
    .populate({
      path: "currentAssignmentId",
      populate: [
        { path: "vendorId", select: "name contactEmail phone rating serviceCategories" },
        { path: "technicianId", select: "name email phone" },
      ],
    })
    .populate("currentEstimateId")
    .lean();

  if (!order) {
    const error = new Error("Work order not found");
    error.statusCode = 404;
    throw error;
  }

  // Authorize access
  if (req.user.role === "resident") {
    if (order.residentId?._id?.toString() !== req.user._id.toString()) {
      const error = new Error("Forbidden: You cannot access another resident's work order.");
      error.statusCode = 403;
      throw error;
    }
  } else if (req.user.role === "property_manager") {
    const hasScope = req.user.propertyScope?.some(
      (p) => p.toString() === order.propertyId?._id?.toString(),
    );
    if (!hasScope && req.user.role !== "admin") {
      const error = new Error("Forbidden: This work order belongs to a property outside your scope.");
      error.statusCode = 403;
      throw error;
    }
  } else if (req.user.role === "vendor_technician") {
    const assignment = await AssignmentModel.findOne({
      workOrderId: order._id,
      technicianId: req.user._id,
      status: { $ne: "expired" },
      retentionExpiresAt: { $gt: new Date() },
    });

    if (!assignment) {
      const error = new Error("Forbidden: You are not authorized to view this work order.");
      error.statusCode = 403;
      throw error;
    }

    // Mask resident private contacts
    if (order.residentId) {
      order.residentId = { name: order.residentId.name };
    }
  }

  res.status(200).json({
    success: true,
    data: {
      workOrder: order,
    },
  });
});

/**
 * POST /api/work-orders/:id/assignment
 * Manager assigns approved vendor and technician.
 */
workOrderRouter.post(
  "/:id/assignment",
  requireRole("property_manager", "admin"),
  async (req, res) => {
    const { id } = req.params;
    const { vendorId, technicianId, notes } = req.body;

    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(vendorId) || !Types.ObjectId.isValid(technicianId)) {
      const error = new Error("Valid workOrderId, vendorId, and technicianId are required.");
      error.statusCode = 400;
      throw error;
    }

    const order = await WorkOrderModel.findById(id);
    if (!order) {
      const error = new Error("Work order not found");
      error.statusCode = 404;
      throw error;
    }

    // Verify manager's property scope
    const isAuthorized = req.user.propertyScope?.some(
      (p) => p.toString() === order.propertyId.toString(),
    );
    if (!isAuthorized && req.user.role !== "admin") {
      const error = new Error("Forbidden: You cannot assign work orders outside your property scope.");
      error.statusCode = 403;
      throw error;
    }

    // Verify vendor and technician eligibility
    const technician = await UserModel.findOne({
      _id: technicianId,
      vendorId,
      role: "vendor_technician",
      accountStatus: "active",
    });

    if (!technician) {
      const error = new Error("Selected technician is not active or not associated with this vendor organization.");
      error.statusCode = 400;
      throw error;
    }

    // Create or update assignment
    const assignment = await AssignmentModel.create({
      workOrderId: order._id,
      propertyId: order.propertyId,
      vendorId: new Types.ObjectId(vendorId),
      technicianId: new Types.ObjectId(technicianId),
      status: "assigned",
      assignedBy: req.user._id,
      progressRecords: [
        {
          status: "assigned",
          notes: notes || "Assigned by property manager",
          timestamp: new Date(),
          recordedBy: req.user._id,
        },
      ],
    });

    order.currentAssignmentId = assignment._id;
    order.status = "Assigned";
    order.timeline.push({
      status: "Assigned",
      changedBy: req.user._id,
      role: req.user.role,
      timestamp: new Date(),
      notes: `Assigned to technician ${technician.name}`,
    });
    await order.save();

    // Create notification for technician
    await NotificationModel.create({
      recipientId: technician._id,
      eventType: "work_order_assigned",
      title: "New Job Assignment",
      message: `You have been assigned to ${order.reference}: ${order.title}`,
      relatedResourceType: "WorkOrder",
      relatedResourceId: order._id,
    });

    await logAuditEvent({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "WORK_ORDER_ASSIGNED",
      propertyId: order.propertyId,
      resourceType: "WorkOrder",
      resourceId: order._id,
      description: `Assigned ${order.reference} to technician ${technician.name}`,
      req,
    });

    res.status(200).json({
      success: true,
      message: "Work order successfully assigned.",
      data: {
        assignment,
        workOrder: order,
      },
    });
  },
);

/**
 * POST /api/work-orders/:id/estimate-decision
 * Manager or resident approves, rejects, or requests revision for an estimate.
 */
workOrderRouter.post("/:id/estimate-decision", async (req, res) => {
  const { id } = req.params;
  const { decision, comments, expectedRevision } = req.body;

  if (!["approved", "rejected", "revision_requested"].includes(decision)) {
    const error = new Error("Invalid decision. Must be approved, rejected, or revision_requested.");
    error.statusCode = 400;
    throw error;
  }

  const order = await WorkOrderModel.findById(id).populate("currentEstimateId");
  if (!order || !order.currentEstimateId) {
    const error = new Error("Work order or active estimate not found.");
    error.statusCode = 404;
    throw error;
  }

  const estimate = await EstimateModel.findById(order.currentEstimateId._id);
  if (!estimate) {
    const error = new Error("Estimate record not found.");
    error.statusCode = 404;
    throw error;
  }

  // Prevent stale revision approval race condition
  if (expectedRevision && estimate.revision !== expectedRevision) {
    const error = new Error(
      `Stale estimate version. The estimate was revised to revision ${estimate.revision}. Please review the updated estimate before deciding.`,
    );
    error.statusCode = 409;
    throw error;
  }

  // Authorization and spending limits checks
  const property = await PropertyModel.findById(order.propertyId);
  const managerLimit = property?.spendingRules?.managerApprovalLimit || 1000;

  if (req.user.role === "property_manager") {
    if (decision === "approved" && estimate.totalAmount > managerLimit) {
      const error = new Error(
        `Estimate total of $${estimate.totalAmount} exceeds manager authorization threshold of $${managerLimit}. Requires executive signoff.`,
      );
      error.statusCode = 403;
      throw error;
    }
  } else if (req.user.role === "resident") {
    // Residents can only decide if they own the work order
    if (order.residentId.toString() !== req.user._id.toString()) {
      const error = new Error("Forbidden: You cannot review estimates for another resident's request.");
      error.statusCode = 403;
      throw error;
    }
  } else {
    const error = new Error("Forbidden: Role not authorized to review estimates.");
    error.statusCode = 403;
    throw error;
  }

  estimate.decisionStatus = decision;
  estimate.decisionHistory.push({
    decision,
    decidedBy: req.user._id,
    decidedRole: req.user.role,
    decidedAt: new Date(),
    comments: comments || "",
    revision: estimate.revision,
  });
  await estimate.save();

  if (decision === "approved") {
    order.status = "Approved";
  } else if (decision === "revision_requested") {
    order.status = "Awaiting Estimate";
  } else {
    order.status = "Rejected";
  }

  order.timeline.push({
    status: order.status,
    changedBy: req.user._id,
    role: req.user.role,
    timestamp: new Date(),
    notes: `Estimate ${decision}: ${comments || "No comments"}`,
  });
  await order.save();

  await logAuditEvent({
    actorId: req.user._id,
    actorRole: req.user.role,
    action: `ESTIMATE_${decision.toUpperCase()}`,
    propertyId: order.propertyId,
    resourceType: "Estimate",
    resourceId: estimate._id,
    description: `Estimate ${decision} for ${order.reference}`,
    req,
  });

  res.status(200).json({
    success: true,
    message: `Estimate ${decision} successfully.`,
    data: {
      workOrder: order,
      estimate,
    },
  });
});

/**
 * POST /api/work-orders/:id/completion-review
 * Resident confirms work resolution or requests reopening.
 */
workOrderRouter.post("/:id/completion-review", async (req, res) => {
  const { id } = req.params;
  const parsed = completionReviewSchema.safeParse(req.body);

  if (!parsed.success) {
    const error = new Error(parsed.error.errors[0].message);
    error.statusCode = 400;
    throw error;
  }

  const { accepted, feedback, reopenReason } = parsed.data;

  const order = await WorkOrderModel.findById(id);
  if (!order) {
    const error = new Error("Work order not found");
    error.statusCode = 404;
    throw error;
  }

  // Resident authorization check
  if (order.residentId.toString() !== req.user._id.toString() && req.user.role !== "property_manager" && req.user.role !== "admin") {
    const error = new Error("Forbidden: Only the reporting resident or property manager can review completion.");
    error.statusCode = 403;
    throw error;
  }

  if (accepted) {
    order.status = "Resolved";
    order.resolvedAt = new Date();
    order.timeline.push({
      status: "Resolved",
      changedBy: req.user._id,
      role: req.user.role,
      timestamp: new Date(),
      notes: `Resident accepted completion. Feedback: ${feedback || "Issue resolved satisfactorily."}`,
    });
  } else {
    if (!reopenReason || reopenReason.trim().length < 5) {
      const error = new Error("A detailed reason is required to request reopening an unresolved work order.");
      error.statusCode = 400;
      throw error;
    }
    order.status = "Reopened";
    order.reopenReason = reopenReason.trim();
    order.reopenedAt = new Date();
    order.reopenedBy = req.user._id;
    order.timeline.push({
      status: "Reopened",
      changedBy: req.user._id,
      role: req.user.role,
      timestamp: new Date(),
      notes: `Reopening requested: ${reopenReason.trim()}`,
    });
  }

  await order.save();

  await logAuditEvent({
    actorId: req.user._id,
    actorRole: req.user.role,
    action: accepted ? "WORK_ORDER_RESOLVED" : "WORK_ORDER_REOPENED",
    propertyId: order.propertyId,
    resourceType: "WorkOrder",
    resourceId: order._id,
    description: accepted
      ? `Work order ${order.reference} resolved by resident review.`
      : `Work order ${order.reference} reopened by resident.`,
    req,
  });

  res.status(200).json({
    success: true,
    message: accepted
      ? "Work order marked as resolved. Thank you for your feedback!"
      : "Reopening request registered. Property manager will review and follow up.",
    data: {
      workOrder: order,
    },
  });
});

/**
 * POST /api/work-orders/:id/upload
 * Attach photographs or supporting documents to a work order.
 */
workOrderRouter.post("/:id/upload", uploadMiddleware.single("file"), async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    const error = new Error("Please upload a file");
    error.statusCode = 400;
    throw error;
  }

  const order = await WorkOrderModel.findById(id);
  if (!order) {
    const error = new Error("Work order not found");
    error.statusCode = 404;
    throw error;
  }

  // Authorization check
  if (req.user.role === "resident" && order.residentId.toString() !== req.user._id.toString()) {
    const error = new Error("Forbidden: You cannot upload attachments to another resident's request.");
    error.statusCode = 403;
    throw error;
  }

  const attachmentData = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: `/api/work-orders/files/${req.file.filename}`,
    uploadedAt: new Date(),
  };

  order.attachments.push(attachmentData);
  await order.save();

  res.status(200).json({
    success: true,
    message: "Attachment uploaded successfully.",
    data: {
      attachment: attachmentData,
    },
  });
});

/**
 * GET /api/work-orders/files/:filename
 * Secure, authenticated file download endpoint checking authorization.
 */
workOrderRouter.get("/files/:filename", async (req, res) => {
  const { filename } = req.params;
  const path = await import("path");
  const fs = await import("fs");

  const uploadDir = process.env.UPLOAD_DIR || "./uploads";
  const filePath = path.resolve(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    const error = new Error("File not found");
    error.statusCode = 404;
    throw error;
  }

  res.sendFile(filePath);
});
