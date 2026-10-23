import { OllamaEmbeddings } from "@langchain/ollama";

const embeddingModelName = process.env.OLLAMA_EMBEDDING_MODEL || "qwen3-embedding:4b";
const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

export const embeddingModel = new OllamaEmbeddings({
  model: embeddingModelName,
  baseUrl: ollamaBaseUrl,
});

/**
 * Service function that takes document metadata and a list of chunks,
 * generates embedding vectors for each chunk, and returns chunk objects ready for insertion.
 */
export async function generateDocumentChunkEmbeddings(
  documentId,
  documentVersion,
  propertyId,
  visibilityScope,
  listOfChunks,
) {
  if (!documentId || !Array.isArray(listOfChunks) || listOfChunks.length === 0) {
    throw new Error("Document ID and a non-empty array of chunks are required.");
  }

  const chunkAndEmbeddings = [];

  for (const [index, chunk] of listOfChunks.entries()) {
    const chunkText = typeof chunk === "string" ? chunk.trim() : chunk.text?.trim();
    const pageOrSection = typeof chunk === "object" ? chunk.pageOrSection || "General" : "General";

    if (!chunkText) {
      continue;
    }

    const embedding = await embeddingModel.embedQuery(chunkText);

    chunkAndEmbeddings.push({
      documentId,
      documentVersion: documentVersion || "1.0",
      chunkIndex: index,
      chunkText,
      pageOrSection,
      propertyId,
      visibilityScope: visibilityScope || "residents",
      embedding,
      embeddingModel: embeddingModelName,
    });
  }

  return chunkAndEmbeddings;
}
