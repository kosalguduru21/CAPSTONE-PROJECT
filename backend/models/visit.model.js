import { Schema, model, Types } from "mongoose";

const visitSchema = new Schema(
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
    propertyId: {
      type: Types.ObjectId,
      ref: "Property",
      required: [true, "Property ID is required"],
      index: true,
    },
    technicianId: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Technician ID is required"],
      index: true,
    },
    residentId: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Resident ID is required"],
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
      index: true,
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["proposed", "confirmed", "completed", "cancelled", "rescheduled"],
      default: "proposed",
      index: true,
    },
    proposalId: {
      type: String,
      default: null,
      index: true,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  },
);

// Prevent technician double booking for confirmed visits
visitSchema.index(
  { technicianId: 1, startTime: 1, endTime: 1, status: 1 },
  { unique: false },
);

export const VisitModel = model("Visit", visitSchema);
