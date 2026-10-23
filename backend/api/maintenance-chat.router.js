import express from "express";
import { Types } from "mongoose";
import { ConversationModel } from "../models/conversation.model.js";
import { ChunkModel } from "../models/chunk.model.js";
import { DocumentModel } from "../models/document.model.js";
import { PropertyModel } from "../models/property.model.js";
import { authenticateSession } from "../middlewares/auth.middleware.js";
import { generateQueryEmbedding } from "../services/generate-query-embedding.service.js";
import { generateStandaloneQuery } from "../services/generate-standalone-query.service.js";
import {
  generateMaintenanceRagAnswer,
  cosineSimilarity,
} from "../services/llm.service.js";

export const maintenanceChatRouter = express.Router();

maintenanceChatRouter.use(authenticateSession);

/**
 * POST /api/maintenance-chat
 * Document-grounded conversational RAG endpoint for policy and equipment questions.
 */
maintenanceChatRouter.post("/", async (req, res) => {
  const { query, conversationId, propertyId, workOrderId } = req.body;

  if (typeof query !== "string" || query.trim() === "") {
    const error = new Error("A non-empty query is required");
    error.statusCode = 400;
    throw error;
  }

  const currentQuery = query.trim();

  // Determine authorized property scope
  let activePropertyId = propertyId;
  if (!activePropertyId) {
    if (req.user.role === "resident") {
      activePropertyId = req.user.residentPropertyId;
    } else if (req.user.role === "property_manager") {
      activePropertyId = req.user.propertyScope?.[0];
    }
  }

  if (!activePropertyId) {
    const error = new Error("Property scope is required for maintenance assistant retrieval.");
    error.statusCode = 400;
    throw error;
  }

  // Find or create conversation
  let conversation;
  if (conversationId && Types.ObjectId.isValid(conversationId)) {
    conversation = await ConversationModel.findOne({
      _id: conversationId,
      userId: req.user._id,
    });
  }

  if (!conversation) {
    conversation = await ConversationModel.create({
      userId: req.user._id,
      propertyId: new Types.ObjectId(activePropertyId),
      workOrderId: workOrderId && Types.ObjectId.isValid(workOrderId) ? new Types.ObjectId(workOrderId) : null,
      messages: [],
    });
  }

  const conversationHistory = conversation.messages.slice(-8);

  // Rewrite follow-up query to standalone query
  const standaloneQuery = await generateStandaloneQuery(
    currentQuery,
    conversationHistory,
  );

  // Generate embedding for retrieval
  const queryVector = await generateQueryEmbedding(standaloneQuery);

  // Build authorization filter for chunks
  const chunkFilter = {
    propertyId: new Types.ObjectId(activePropertyId),
  };

  if (req.user.role === "resident") {
    chunkFilter.visibilityScope = { $in: ["public", "residents"] };
  } else if (req.user.role === "vendor_technician") {
    chunkFilter.visibilityScope = { $in: ["public", "vendors", "residents"] };
  }

  let retrievedChunks = [];

  // Attempt Atlas Vector Search
  try {
    retrievedChunks = await ChunkModel.aggregate([
      {
        $vectorSearch: {
          index: "document_vector_index",
          path: "embedding",
          queryVector,
          numCandidates: 60,
          limit: 5,
          filter: chunkFilter,
        },
      },
      {
        $lookup: {
          from: "documents",
          localField: "documentId",
          foreignField: "_id",
          as: "doc",
        },
      },
      {
        $project: {
          _id: 1,
          documentId: 1,
          documentVersion: 1,
          chunkText: 1,
          pageOrSection: 1,
          documentTitle: { $arrayElemAt: ["$doc.title", 0] },
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);
  } catch (vectorSearchError) {
    // Local cosine similarity retrieval fallback
    const candidateChunks = await ChunkModel.find(chunkFilter)
      .populate("documentId", "title")
      .lean();

    const scored = candidateChunks.map((chunk) => {
      const score = cosineSimilarity(queryVector, chunk.embedding);
      return {
        _id: chunk._id,
        documentId: chunk.documentId?._id || chunk.documentId,
        documentTitle: chunk.documentId?.title || "Maintenance Document",
        documentVersion: chunk.documentVersion,
        chunkText: chunk.chunkText,
        pageOrSection: chunk.pageOrSection,
        score,
      };
    });

    retrievedChunks = scored
      .filter((c) => c.score >= 0.45)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  const property = await PropertyModel.findById(activePropertyId).select("name emergencyContacts");
  const emergencyPhone = property?.emergencyContacts?.[0]?.phone || "the front office";

  // Generate grounded answer with citations
  const { answer, citations } = await generateMaintenanceRagAnswer(
    currentQuery,
    retrievedChunks,
    conversationHistory,
    {
      name: property?.name || "Community",
      emergencyPhone,
    },
  );

  // Record user and assistant messages
  conversation.messages.push({
    role: "user",
    content: currentQuery,
    timestamp: new Date(),
  });

  conversation.messages.push({
    role: "assistant",
    content: answer,
    citations,
    timestamp: new Date(),
  });

  await conversation.save();

  res.status(200).json({
    success: true,
    data: {
      conversationId: conversation._id,
      answer,
      citations,
      standaloneQuery,
      retrievedChunksCount: retrievedChunks.length,
    },
  });
});

/**
 * GET /api/maintenance-chat/history
 * Returns user's private conversations.
 */
maintenanceChatRouter.get("/history", async (req, res) => {
  const conversations = await ConversationModel.find({ userId: req.user._id })
    .select("title propertyId workOrderId messages createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: {
      conversations,
    },
  });
});
