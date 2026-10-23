import { Schema, model, Types } from "mongoose";

const auditEventSchema = new Schema(
  {
    actorId: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorRole: {
      type: String,
      default: "system",
    },
    action: {
      type: String,
      required: [true, "Action name is required"],
      index: true,
    },
    propertyId: {
      type: Types.ObjectId,
      ref: "Property",
      default: null,
      index: true,
    },
    resourceType: {
      type: String,
      required: [true, "Resource type is required"],
    },
    resourceId: {
      type: Types.ObjectId,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    beforeState: {
      type: Schema.Types.Mixed,
      default: null,
    },
    afterState: {
      type: Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
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

export const AuditEventModel = model("AuditEvent", auditEventSchema);
