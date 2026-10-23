import { Schema, model, Types } from "mongoose";

const buildingSchema = new Schema(
  {
    propertyId: {
      type: Types.ObjectId,
      ref: "Property",
      required: [true, "Property ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Building name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Building code is required"],
      trim: true,
    },
    address: {
      type: String,
      default: "",
    },
    totalFloors: {
      type: Number,
      default: 3,
    },
    status: {
      type: String,
      enum: ["active", "maintenance", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  },
);

buildingSchema.index({ propertyId: 1, code: 1 }, { unique: true });

export const BuildingModel = model("Building", buildingSchema);
