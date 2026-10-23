import { embeddingModel } from "./generate-embeddings.service.js";

/**
 * Service function that generates an embedding vector for a standalone search query.
 */
export async function generateQueryEmbedding(query) {
  if (typeof query !== "string" || query.trim() === "") {
    throw new Error("A non-empty query string is required for embedding generation.");
  }

  const cleanQuery = query.trim();
  const queryEmbedding = await embeddingModel.embedQuery(cleanQuery);

  return queryEmbedding;
}
