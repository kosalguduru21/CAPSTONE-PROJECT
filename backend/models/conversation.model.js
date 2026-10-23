import { Schema, model, Types } from "mongoose";

const citationSchema = new Schema(
  {
    documentId: {
      type: Types.ObjectId,
      ref: "Document",
    },
    title: {
      type: String,
      required: true,
    },
    pageOrSection: {
      type: String,
      default: "General",
    },
    version: {
      type: String,
      default: "1.0",
    },
    snippet: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    role: {
      type: String,
      enum: {
        values: ["user", "assistant", "system"],
        message: "Message role must be user, assistant, or system",
      },
      required: [true, "Message role is required"],
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
    },
    citations: [citationSchema],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const conversationSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    propertyId: {
      type: Types.ObjectId,
      ref: "Property",
      required: [true, "Property ID is required"],
      index: true,
    },
    workOrderId: {
      type: Types.ObjectId,
      ref: "WorkOrder",
      default: null,
    },
    title: {
      type: String,
      default: "Maintenance Assistance Chat",
      trim: true,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  },
);

export const ConversationModel = model("Conversation", conversationSchema);
