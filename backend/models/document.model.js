import { Schema, model, Types } from "mongoose";

const documentSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Document title is required"],
      trim: true,
    },
    documentType: {
      type: String,
      enum: ["policy", "manual", "procedure", "warranty", "notice"],
      required: [true, "Document type is required"],
    },
    propertyId: {
      type: Types.ObjectId,
      ref: "Property",
      required: [true, "Property ID is required"],
      index: true,
    },
    sourceFilename: {
      type: String,
      required: [true, "Source filename is required"],
    },
    storagePath: {
      type: String,
      required: [true, "Storage path is required"],
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    version: {
      type: String,
      default: "1.0",
    },
    visibilityScope: {
      type: String,
      enum: ["public", "residents", "managers", "vendors"],
      default: "residents",
      index: true,
    },
    uploadedBy: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "Uploader user ID is required"],
    },
    processingStatus: {
      type: String,
      enum: ["Pending", "Extracting", "Embedding", "Ready", "Failed"],
      default: "Pending",
      index: true,
    },
    extractionMetadata: {
      pageCount: { type: Number, default: 0 },
      textLength: { type: Number, default: 0 },
      chunkCount: { type: Number, default: 0 },
      error: { type: String, default: "" },
    },
    embeddingModel: {
      type: String,
      default: "qwen3-embedding:4b",
    },
    embeddingModelVersion: {
      type: String,
      default: "1.0",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: "throw",
  },
);

export const DocumentModel = model("Document", documentSchema);
