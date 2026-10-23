import { Schema, model, Types } from "mongoose";

const timelineEntrySchema = new Schema(
  {
    status: {
      type: String,
      required: true,
    },
    changedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

const attachmentSchema = new Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const preferredWindowSchema = new Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const relatedCaseEntrySchema = new Schema(
  {
    workOrderId: {
      type: Types.ObjectId,
      ref: "WorkOrder",
      required: true,
    },
    similarityScore: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    markedBy: {
      type: Types.ObjectId,
      ref: "User",
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    isDismissed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const workOrderSchema = new Schema(
  {
    reference: {
      type: String,
      required: [true, "Work order reference is required"],
      unique: true,
      index: true,
    },
    propertyId: {
      type: Types.ObjectId,
      ref: "Property",
      required: [true, "Property ID is required"],
      index: true,
    },
    buildingId: {
      type: Types.ObjectId,
      ref: "Building",
      default: null,
    },
    unitId: {
      type: Types.ObjectId,
      ref: "Unit",
      default: null,
    },
    isSharedArea: {
      type: Boolean,
      default: false,
    },
    sharedAreaIdentifier: {
      type: String,
      default: "",
    },
    residentId: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Resident ID is required"],
      index: true,
    },
    category: {
      type: String,
      enum: [
        "plumbing",
        "electrical",
        "hvac",
        "appliances",
        "fixtures",
        "structural",
        "cleaning",
        "shared_area",
        "other",
      ],
      required: [true, "Maintenance category is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Problem description is required"],
      trim: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "emergency"],
      default: "normal",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "Submitted",
        "Under Review",
        "Awaiting Estimate",
        "Awaiting Approval",
        "Approved",
        "Scheduled",
        "Assigned",
        "In Progress",
        "Work Completed — Awaiting Review",
        "Resolved",
        "Reopened",
        "Cancelled",
        "Rejected",
      ],
      default: "Submitted",
      index: true,
    },
    attachments: [attachmentSchema],
    preferredAccessWindows: [preferredWindowSchema],
    accessPreferences: {
      type: String,
      default: "Resident will be home or permission to enter granted.",
    },
    currentAssignmentId: {
      type: Types.ObjectId,
      ref: "Assignment",
      default: null,
    },
    currentEstimateId: {
      type: Types.ObjectId,
      ref: "Estimate",
      default: null,
    },
    relatedCases: [relatedCaseEntrySchema],
    completionNotes: {
      type: String,
      default: "",
    },
    completionEvidence: [attachmentSchema],
    reopenReason: {
      type: String,
      default: "",
    },
    reopenedAt: {
      type: Date,
      default: null,
    },
    reopenedBy: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    timeline: [timelineEntrySchema],
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  },
);

workOrderSchema.index({ propertyId: 1, status: 1 });
workOrderSchema.index({ propertyId: 1, category: 1 });
workOrderSchema.index({ residentId: 1, createdAt: -1 });

export const WorkOrderModel = model("WorkOrder", workOrderSchema);
