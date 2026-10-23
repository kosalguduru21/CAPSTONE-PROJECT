import { Schema, model, Types } from "mongoose";

const lineItemSchema = new Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const decisionHistorySchema = new Schema(
  {
    decision: {
      type: String,
      enum: ["approved", "rejected", "revision_requested"],
      required: true,
    },
    decidedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    decidedRole: {
      type: String,
      required: true,
    },
    decidedAt: {
      type: Date,
      default: Date.now,
    },
    comments: {
      type: String,
      default: "",
    },
    revision: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const estimateSchema = new Schema(
  {
    workOrderId: {
      type: Types.ObjectId,
      ref: "WorkOrder",
      required: [true, "Work order ID is required"],
      index: true,
    },
    assignmentId: {
      type: Types.ObjectId,
      ref: "Assignment",
      required: [true, "Assignment ID is required"],
      index: true,
    },
    vendorId: {
      type: Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor ID is required"],
    },
    technicianId: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Technician user ID is required"],
    },
    revision: {
      type: Number,
      default: 1,
    },
    lineItems: {
      type: [lineItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "Estimate must include at least one line item",
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    laborCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    materialCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    exclusions: {
      type: String,
      default: "Unforeseen structural damage behind drywall not included.",
    },
    assumptions: {
      type: String,
      default: "Clear access to unit and plumbing/electrical mains provided.",
    },
    validUntil: {
      type: Date,
      required: true,
    },
    decisionStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "revision_requested"],
      default: "pending",
      index: true,
    },
    decisionHistory: [decisionHistorySchema],
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  },
);

export const EstimateModel = model("Estimate", estimateSchema);
