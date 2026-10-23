import { Schema, model, Types } from "mongoose";

const propertySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Property name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Property code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
    },
    timezone: {
      type: String,
      default: "America/New_York",
    },
    officeHours: {
      type: String,
      default: "Monday - Friday: 9:00 AM - 5:00 PM EST",
    },
    emergencyContacts: [
      {
        title: { type: String, required: true },
        phone: { type: String, required: true },
        description: { type: String, default: "" },
        availableHours: { type: String, default: "24/7" },
      },
    ],
    spendingRules: {
      managerApprovalLimit: {
        type: Number,
        default: 1000, // Manager can approve up to $1000 without upper executive signoff
      },
      requireResidentApprovalAbove: {
        type: Number,
        default: 250, // Estimates above $250 require resident co-approval if tenant-chargeable
      },
      autoApprovalLimit: {
        type: Number,
        default: 0, // No auto approval without human review
      },
    },
    notices: [
      {
        title: { type: String, required: true },
        content: { type: String, required: true },
        category: { type: String, default: "General" },
        publishedAt: { type: Date, default: Date.now },
        isPublic: { type: Boolean, default: true },
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  },
);

export const PropertyModel = model("Property", propertySchema);
