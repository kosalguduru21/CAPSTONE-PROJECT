import { Schema, model, Types } from "mongoose";

const vendorSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Vendor organization name is required"],
      trim: true,
      unique: true,
    },
    contactEmail: {
      type: String,
      required: [true, "Contact email is required"],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Vendor phone number is required"],
      trim: true,
    },
    serviceCategories: {
      type: [String],
      enum: ["plumbing", "electrical", "hvac", "appliances", "fixtures", "structural", "cleaning", "general"],
      required: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    approvedProperties: [
      {
        type: Types.ObjectId,
        ref: "Property",
      },
    ],
    hourlyRate: {
      type: Number,
      default: 85,
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    status: {
      type: String,
      enum: ["approved", "pending", "suspended"],
      default: "approved",
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

export const VendorModel = model("Vendor", vendorSchema);
