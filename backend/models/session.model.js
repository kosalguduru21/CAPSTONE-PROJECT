import { Schema, model, Types } from "mongoose";

const sessionSchema = new Schema(
  {
    sessionId: {
      type: String,
      required: [true, "Session ID is required"],
      unique: true,
      index: true,
    },
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    csrfToken: {
      type: String,
      required: [true, "CSRF token is required"],
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration timestamp is required"],
      index: { expires: 0 },
    },
    userAgent: {
      type: String,
      default: "",
    },
    ipAddress: {
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

export const SessionModel = model("Session", sessionSchema);
