import express from "express";
import fs from "fs";
import { Types } from "mongoose";
import { DocumentModel } from "../models/document.model.js";
import { ChunkModel } from "../models/chunk.model.js";
import { authenticateSession } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/authorize.middleware.js";
import { uploadMiddleware } from "../middlewares/multer.middleware.js";
import { extractTextFromFile } from "../services/text-extraction.service.js";
import { splitDocumentToChunks } from "../services/split-document.service.js";
import { generateDocumentChunkEmbeddings } from "../services/generate-embeddings.service.js";
import { logAuditEvent } from "../services/audit.service.js";

export const documentRouter = express.Router();

documentRouter.use(authenticateSession);

/**
 * Helper to process document ingestion pipeline asynchronously or synchronously.
 */
async function processDocumentIngestion(documentRecord) {
  try {
    // 1. Extraction Phase
    documentRecord.processingStatus = "Extracting";
    await documentRecord.save();

    const fileBuffer = fs.readFileSync(documentRecord.storagePath);
    const { cleanedText, pageCount, rawLength } = await extractTextFromFile(
      fileBuffer,
      documentRecord.mimeType,
    );

    // 2. Splitting Phase
    const structuredChunks = await splitDocumentToChunks(cleanedText, 750, 100);

    // 3. Embedding Phase
    documentRecord.processingStatus = "Embedding";
    await documentRecord.save();

    // Delete any existing chunks for this document (safe retry without duplicates)
    await ChunkModel.deleteMany({ documentId: documentRecord._id });

    // Generate Ollama embeddings
    const chunksWithEmbeddings = await generateDocumentChunkEmbeddings(
      documentRecord._id,
      documentRecord.version,
      documentRecord.propertyId,
      documentRecord.visibilityScope,
      structuredChunks,
    );

    if (chunksWithEmbeddings.length > 0) {
      await ChunkModel.insertMany(chunksWithEmbeddings);
    }

    // 4. Ready Phase
    documentRecord.processingStatus = "Ready";
    documentRecord.extractionMetadata = {
      pageCount,
      textLength: rawLength,
      chunkCount: chunksWithEmbeddings.length,
      error: "",
    };
    await documentRecord.save();
  } catch (err) {
    console.error(`[Ingestion Pipeline Failed] Document ${documentRecord._id}:`, err);
    documentRecord.processingStatus = "Failed";
    documentRecord.extractionMetadata.error = err.message || "Extraction or embedding failed";
    await documentRecord.save();
  }
}

/**
 * POST /api/documents/upload
 * Manager uploads maintenance policy or equipment manual.
 */
documentRouter.post(
  "/upload",
  requireRole("property_manager", "admin"),
  uploadMiddleware.single("file"),
  async (req, res) => {
    if (!req.file) {
      const error = new Error("Please upload a PDF or TXT file");
      error.statusCode = 400;
      throw error;
    }

    const {
      title,
      documentType,
      propertyId,
      version = "1.0",
      visibilityScope = "residents",
    } = req.body;

    if (!title || !documentType || !propertyId) {
      const error = new Error("Title, documentType, and propertyId are required");
      error.statusCode = 400;
      throw error;
    }

    // Check manager property scope
    const isAuthorized = req.user.propertyScope?.some(
      (p) => p.toString() === propertyId.toString(),
    );
    if (!isAuthorized && req.user.role !== "admin") {
      const error = new Error("Forbidden: You cannot upload documents for a property outside your scope.");
      error.statusCode = 403;
      throw error;
    }

    const doc = await DocumentModel.create({
      title: title.trim(),
      documentType,
      propertyId: new Types.ObjectId(propertyId),
      sourceFilename: req.file.originalname,
      storagePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      version,
      visibilityScope,
      uploadedBy: req.user._id,
      processingStatus: "Pending",
      extractionMetadata: { pageCount: 0, textLength: 0, chunkCount: 0, error: "" },
      embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || "qwen3-embedding:4b",
    });

    // Execute ingestion pipeline
    await processDocumentIngestion(doc);

    await logAuditEvent({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "DOCUMENT_UPLOADED",
      propertyId: doc.propertyId,
      resourceType: "Document",
      resourceId: doc._id,
      description: `Uploaded and processed document "${doc.title}" (${doc.processingStatus})`,
      req,
    });

    res.status(201).json({
      success: true,
      message: `Document uploaded. Current status: ${doc.processingStatus}`,
      data: {
        document: doc,
      },
    });
  },
);

/**
 * GET /api/documents
 * List documents authorized for the caller's role and property.
 */
documentRouter.get("/", async (req, res) => {
  const { propertyId, documentType } = req.query;

  const filter = {};
  if (documentType) filter.documentType = documentType;

  if (req.user.role === "property_manager") {
    filter.propertyId = propertyId || { $in: req.user.propertyScope || [] };
  } else if (req.user.role === "resident") {
    filter.propertyId = req.user.residentPropertyId;
    filter.visibilityScope = { $in: ["public", "residents"] };
  } else if (req.user.role === "vendor_technician") {
    filter.visibilityScope = { $in: ["public", "vendors", "residents"] };
  }

  const documents = await DocumentModel.find(filter)
    .populate("uploadedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: {
      documents,
    },
  });
});

/**
 * GET /api/documents/:id/status
 */
documentRouter.get("/:id/status", async (req, res) => {
  const { id } = req.params;

  const doc = await DocumentModel.findById(id).select(
    "title processingStatus extractionMetadata version updatedAt",
  );

  if (!doc) {
    const error = new Error("Document not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: {
      status: doc.processingStatus,
      metadata: doc.extractionMetadata,
      version: doc.version,
    },
  });
});

/**
 * POST /api/documents/:id/retry
 * Retries a failed or stalled ingestion without creating duplicate chunks.
 */
documentRouter.post(
  "/:id/retry",
  requireRole("property_manager", "admin"),
  async (req, res) => {
    const { id } = req.params;

    const doc = await DocumentModel.findById(id);
    if (!doc) {
      const error = new Error("Document not found");
      error.statusCode = 404;
      throw error;
    }

    await processDocumentIngestion(doc);

    res.status(200).json({
      success: true,
      message: `Document ingestion retried. Status: ${doc.processingStatus}`,
      data: {
        document: doc,
      },
    });
  },
);

/**
 * DELETE /api/documents/:id
 * Removes document and immediately cascade-deletes all associated chunks to prevent unauthorized retrieval.
 */
documentRouter.delete(
  "/:id",
  requireRole("property_manager", "admin"),
  async (req, res) => {
    const { id } = req.params;

    const doc = await DocumentModel.findById(id);
    if (!doc) {
      const error = new Error("Document not found");
      error.statusCode = 404;
      throw error;
    }

    // Cascade delete all vector chunks immediately
    await ChunkModel.deleteMany({ documentId: doc._id });

    // Clean up local disk file if exists
    if (fs.existsSync(doc.storagePath)) {
      try {
        fs.unlinkSync(doc.storagePath);
      } catch (e) {
        console.warn("[File cleanup warn]", e.message);
      }
    }

    await DocumentModel.deleteOne({ _id: doc._id });

    await logAuditEvent({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "DOCUMENT_DELETED",
      propertyId: doc.propertyId,
      resourceType: "Document",
      resourceId: doc._id,
      description: `Deleted document "${doc.title}" and purged all vector chunks.`,
      req,
    });

    res.status(200).json({
      success: true,
      message: "Document and all vector search chunks permanently deleted.",
    });
  },
);
