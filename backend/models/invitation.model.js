import { Schema, model, Types } from "mongoose";

const invitationSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Invitation email is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    token: {
      type: String,
      required: [true, "Invitation token is required"],
      unique: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["resident", "property_manager", "vendor_technician"],
      required: [true, "Intended role is required"],
    },
    propertyId: {
      type: Types.ObjectId,
      ref: "Property",
      required: [true, "Property ID is required"],
      index: true,
    },
    unitId: {
      type: Types.ObjectId,
      ref: "Unit",
      default: null,
    },
    vendorId: {
      type: Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
    invitedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Invited by user ID is required"],
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration timestamp is required"],
    },
    used: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  },
);

export const InvitationModel = model("Invitation", invitationSchema);
