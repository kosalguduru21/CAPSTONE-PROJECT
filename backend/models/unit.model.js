import { Schema, model, Types } from "mongoose";

const unitSchema = new Schema(
  {
    propertyId: {
      type: Types.ObjectId,
      ref: "Property",
      required: [true, "Property ID is required"],
      index: true,
    },
    buildingId: {
      type: Types.ObjectId,
      ref: "Building",
      required: [true, "Building ID is required"],
      index: true,
    },
    unitNumber: {
      type: String,
      required: [true, "Unit number is required"],
      trim: true,
    },
    floor: {
      type: Number,
      default: 1,
    },
    residentIds: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],
    accessInstructions: {
      type: String,
      default: "Standard electronic keypad or front desk concierge check-in.",
    },
    status: {
      type: String,
      enum: ["occupied", "vacant", "maintenance"],
      default: "occupied",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  },
);

unitSchema.index({ propertyId: 1, buildingId: 1, unitNumber: 1 }, { unique: true });

export const UnitModel = model("Unit", unitSchema);
