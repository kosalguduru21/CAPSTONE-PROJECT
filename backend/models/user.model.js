import { Schema, model, Types } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: {
        values: ["resident", "property_manager", "vendor_technician", "admin"],
        message: "Role must be resident, property_manager, vendor_technician, or admin",
      },
      required: [true, "Role is required"],
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    verificationTokenExpiresAt: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetTokenExpiresAt: {
      type: Date,
      default: null,
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "pending"],
      default: "active",
    },
    // Manager property scope: properties managed by this manager
    propertyScope: [
      {
        type: Types.ObjectId,
        ref: "Property",
      },
    ],
    // Resident unit assignment: property and unit where resident lives
    residentPropertyId: {
      type: Types.ObjectId,
      ref: "Property",
      default: null,
    },
    residentUnitId: {
      type: Types.ObjectId,
      ref: "Unit",
      default: null,
    },
    // Vendor technician organization and skill set
    vendorId: {
      type: Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
    skills: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  },
);

export const UserModel = model("User", userSchema);
