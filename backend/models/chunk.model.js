import { Schema, model, Types } from "mongoose";

const chunkSchema = new Schema(
  {
    documentId: {
      type: Types.ObjectId,
      ref: "Document",
      required: [true, "Document ID is required"],
      index: true,
    },
    documentVersion: {
      type: String,
      default: "1.0",
    },
    chunkIndex: {
      type: Number,
      required: [true, "Chunk index is required"],
      min: [0, "Chunk index cannot be negative"],
    },
    chunkText: {
      type: String,
      required: [true, "Chunk text is required"],
      trim: true,
    },
    pageOrSection: {
      type: String,
      default: "General",
    },
    propertyId: {
      type: Types.ObjectId,
      ref: "Property",
      required: [true, "Property ID is required"],
      index: true,
    },
    visibilityScope: {
      type: String,
      enum: ["public", "residents", "managers", "vendors"],
      default: "residents",
      index: true,
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

chunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });
chunkSchema.index({ propertyId: 1, visibilityScope: 1 });

export const ChunkModel = model("Chunk", chunkSchema);
