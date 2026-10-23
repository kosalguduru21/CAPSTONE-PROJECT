import { WorkOrderEmbeddingModel } from "../models/work-order-embedding.model.js";
import { WorkOrderModel } from "../models/work-order.model.js";
import { UnitModel } from "../models/unit.model.js";
import { BuildingModel } from "../models/building.model.js";
import { generateQueryEmbedding } from "./generate-query-embedding.service.js";
import { cosineSimilarity } from "./llm.service.js";

/**
 * Indexes or updates a work order's semantic embedding.
 */
export async function indexWorkOrderEmbedding(workOrder) {
  try {
    const textToEmbed = `Title: ${workOrder.title}
Category: ${workOrder.category}
Description: ${workOrder.description}`;

    const embedding = await generateQueryEmbedding(textToEmbed);

    await WorkOrderEmbeddingModel.findOneAndUpdate(
      { workOrderId: workOrder._id },
      {
        workOrderId: workOrder._id,
        propertyId: workOrder.propertyId,
        title: workOrder.title,
        description: workOrder.description,
        category: workOrder.category,
        embedding,
        embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || "qwen3-embedding:4b",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (err) {
    console.error(`[Related Case Indexing] Failed for WO ${workOrder._id}:`, err.message);
  }
}

/**
 * Searches for potentially related work orders within the same property using semantic vector similarity.
 */
export async function findRelatedWorkOrders(workOrderId, propertyId, options = {}) {
  const { limit = 5, minSimilarity = 0.55 } = options;

  const currentWorkOrder = await WorkOrderModel.findById(workOrderId);
  if (!currentWorkOrder) {
    throw new Error("Work order not found");
  }

  const queryText = `Title: ${currentWorkOrder.title}
Category: ${currentWorkOrder.category}
Description: ${currentWorkOrder.description}`;

  const queryVector = await generateQueryEmbedding(queryText);

  let searchResults = [];

  // Attempt Atlas Vector Search aggregation first
  try {
    searchResults = await WorkOrderEmbeddingModel.aggregate([
      {
        $vectorSearch: {
          index: "work_order_vector_index",
          path: "embedding",
          queryVector,
          numCandidates: 50,
          limit: limit + 1,
          filter: {
            propertyId: currentWorkOrder.propertyId,
          },
        },
      },
      {
        $project: {
          _id: 0,
          workOrderId: 1,
          title: 1,
          description: 1,
          category: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);
  } catch (vectorSearchError) {
    // Graceful fallback to local vector cosine similarity calculation
    const allPropertyEmbeddings = await WorkOrderEmbeddingModel.find({
      propertyId,
      workOrderId: { $ne: currentWorkOrder._id },
    }).lean();

    const scored = allPropertyEmbeddings
      .map((item) => {
        const score = cosineSimilarity(queryVector, item.embedding);
        return {
          workOrderId: item.workOrderId,
          title: item.title,
          description: item.description,
          category: item.category,
          score,
        };
      })
      .filter((item) => item.score >= minSimilarity)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    searchResults = scored;
  }

  // Filter out the work order itself and populate work order details safely
  const candidateIds = searchResults
    .filter((r) => r.workOrderId.toString() !== workOrderId.toString())
    .map((r) => r.workOrderId);

  const populatedOrders = await WorkOrderModel.find({
    _id: { $in: candidateIds },
    propertyId,
  })
    .populate("unitId", "unitNumber")
    .populate("buildingId", "name code")
    .lean();

  const resultsWithDetails = searchResults
    .filter((r) => r.workOrderId.toString() !== workOrderId.toString())
    .map((match) => {
      const order = populatedOrders.find(
        (o) => o._id.toString() === match.workOrderId.toString(),
      );
      if (!order) return null;

      return {
        workOrderId: order._id,
        reference: order.reference,
        title: order.title,
        category: order.category,
        priority: order.priority,
        status: order.status,
        createdAt: order.createdAt,
        location: order.isSharedArea
          ? `Shared Area: ${order.sharedAreaIdentifier || "Common"}`
          : `Building ${order.buildingId?.code || ""}, Unit ${order.unitId?.unitNumber || ""}`,
        similarityScore: Math.round(match.score * 100) / 100,
        similarityExplanation: generateSimilarityExplanation(
          currentWorkOrder,
          order,
          match.score,
        ),
      };
    })
    .filter(Boolean);

  return resultsWithDetails;
}

function generateSimilarityExplanation(target, match, score) {
  const percentage = Math.round(score * 100);
  let rationale = `${percentage}% semantic similarity in reported symptoms and scope.`;
  if (target.category === match.category) {
    rationale += ` Both cases concern ${target.category}.`;
  }
  if (
    target.buildingId &&
    match.buildingId &&
    target.buildingId.toString() === match.buildingId.toString()
  ) {
    rationale += ` Both are located within the same building, suggesting possible shared plumbing, electrical, or structural infrastructure.`;
  }
  return rationale;
}
