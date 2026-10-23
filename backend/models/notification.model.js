import { Schema, model, Types } from "mongoose";

const notificationSchema = new Schema(
  {
    recipientId: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Recipient ID is required"],
      index: true,
    },
    eventType: {
      type: String,
      required: [true, "Event type is required"],
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
    },
    relatedResourceType: {
      type: String,
      default: "WorkOrder",
    },
    relatedResourceId: {
      type: Types.ObjectId,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  },
);

export const NotificationModel = model("Notification", notificationSchema);
