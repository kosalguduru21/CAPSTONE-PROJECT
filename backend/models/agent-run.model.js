import { Schema, model, Types } from "mongoose";

const toolRunSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    input: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["success", "error", "skipped"],
      default: "success",
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
      default: null,
    },
  },
  { _id: false },
);

const agentRunSchema = new Schema(
  {
    proposalId: {
      type: String,
      required: [true, "Proposal ID is required"],
      unique: true,
      index: true,
    },
    requestingUserId: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Requesting user ID is required"],
      index: true,
    },
    propertyId: {
      type: Types.ObjectId,
      ref: "Property",
      required: [true, "Property ID is required"],
      index: true,
    },
    workflowType: {
      type: String,
      default: "maintenance_scheduling",
    },
    status: {
      type: String,
      enum: ["proposed", "confirmed", "rejected", "expired", "failed"],
      default: "proposed",
      index: true,
    },
    toolsUsed: [toolRunSchema],
    proposalData: {
      type: Schema.Types.Mixed,
      required: true,
    },
    conflicts: {
      type: [String],
      default: [],
    },
    unresolvedConstraints: {
      type: [String],
      default: [],
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    confirmedBy: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  },
);

export const AgentRunModel = model("AgentRun", agentRunSchema);
