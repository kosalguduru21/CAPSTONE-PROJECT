import { Schema, model, Types } from "mongoose";

const progressRecordSchema = new Schema(
  {
    status: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: false },
);

const proposedWindowSchema = new Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const assignmentSchema = new Schema(
  {
    workOrderId: {
      type: Types.ObjectId,
      ref: "WorkOrder",
      required: [true, "Work order ID is required"],
      index: true,
    },
    propertyId: {
      type: Types.ObjectId,
      ref: "Property",
      required: [true, "Property ID is required"],
      index: true,
    },
    vendorId: {
      type: Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor ID is required"],
      index: true,
    },
    technicianId: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Technician user ID is required"],
      index: true,
    },
    status: {
      type: String,
      enum: [
        "assigned",
        "proposed",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "expired",
      ],
      default: "assigned",
      index: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    assignedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Assigned by manager ID is required"],
    },
    proposedVisitWindows: [proposedWindowSchema],
    confirmedVisit: {
      start: { type: Date },
      end: { type: Date },
      confirmedAt: { type: Date },
      confirmedBy: { type: Types.ObjectId, ref: "User" },
    },
    accessScope: {
      unitAccessPermitted: { type: Boolean, default: true },
      specialInstructions: { type: String, default: "" },
    },
    retentionExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days retention
      index: true,
    },
    progressRecords: [progressRecordSchema],
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  },
);

export const AssignmentModel = model("Assignment", assignmentSchema);
