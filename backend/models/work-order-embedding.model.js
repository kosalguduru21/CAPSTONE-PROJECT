import { Schema, model, Types } from "mongoose";

const workOrderEmbeddingSchema = new Schema(
  {
    workOrderId: {
      type: Types.ObjectId,
      ref: "WorkOrder",
      required: [true, "Work order ID is required"],
      unique: true,
      index: true,
    },
    propertyId: {
      type: Types.ObjectId,
      ref: "Property",
      required: [true, "Property ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: [true, "Embedding vector is required"],
      validate: {
        validator: (v) => Array.isArray(v) && (v.length === 2560 || v.length === 768),
        message: "Embedding must match vector length (2560 or 768)",
      },
    },
    embeddingModel: {
      type: String,
      default: "qwen3-embedding:4b",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  },
);

export const WorkOrderEmbeddingModel = model("WorkOrderEmbedding", workOrderEmbeddingSchema);
