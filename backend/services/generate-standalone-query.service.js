import { ChatOllama } from "@langchain/ollama";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";

const chatModel = new ChatOllama({
  model: process.env.OLLAMA_LLM_MODEL || "qwen3:8b",
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  temperature: 0,
});

/**
 * Convert a context-dependent follow-up question into
 * an independently understandable search query.
 */
export async function generateStandaloneQuery(
  currentQuery,
  conversationHistory = [],
) {
  if (typeof currentQuery !== "string" || currentQuery.trim() === "") {
    throw new Error("A non-empty query is required");
  }

  const normalizedQuery = currentQuery.trim();

  // If there's no conversation history, the query is already standalone
  if (!conversationHistory || conversationHistory.length === 0) {
    return normalizedQuery;
  }

  const messages = [
    new SystemMessage(`
You rewrite follow-up questions into standalone search queries for an apartment maintenance knowledge base.

Use the conversation history only to resolve references such as "it", "they", "that", "this", "my leak", or omitted subjects.

Rules:
1. Preserve the user's original maintenance context.
2. Do not answer the question.
3. Do not add facts that are not present in the conversation.
4. Return only the rewritten standalone query string.
5. Do not include conversational remarks, labels, quotation marks, or formatting.
`),
  ];

  // Include recent conversation messages (up to 6)
  const recentHistory = conversationHistory.slice(-6);
  for (const message of recentHistory) {
    if (message.role === "user") {
      messages.push(new HumanMessage(message.content));
    }
    if (message.role === "assistant") {
      messages.push(new AIMessage(message.content));
    }
  }

  messages.push(
    new HumanMessage(
      `Rewrite this follow-up question as a standalone search query: ${normalizedQuery}`,
    ),
  );

  try {
    const response = await chatModel.invoke(messages);
    const content = typeof response.content === "string" ? response.content.trim() : normalizedQuery;
    // Strip possible quotes or markdown prefix
    return content.replace(/^["'`]+|["'`]+$/g, "").trim();
  } catch (err) {
    console.warn("[Standalone Query Service] Fallback to raw query:", err.message);
    return normalizedQuery;
  }
}
