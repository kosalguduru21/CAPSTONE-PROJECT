import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

/**
 * Splits document text into overlapping chunks using paragraph -> line -> word -> character priority.
 * Attaches detected section headers or page hints where available.
 */
export async function splitDocumentToChunks(rawText, chunkSize = 800, chunkOverlap = 120) {
  if (typeof rawText !== "string" || rawText.trim() === "") {
    throw new Error("Valid document text is required for splitting.");
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  const rawChunks = await splitter.splitText(rawText);

  // Analyze chunks to identify section markers (e.g., "Section 3:", "Article II:", "Emergency Procedures:")
  const structuredChunks = rawChunks.map((chunkText, idx) => {
    let pageOrSection = `Section ${idx + 1}`;
    const headerMatch = chunkText.match(/^(?:Section|Chapter|Article|Policy|Part)\s+[0-9A-ZIVX]+[:\s\-]+[^\n]+/im);
    if (headerMatch) {
      pageOrSection = headerMatch[0].trim();
    } else {
      const firstLine = chunkText.split("\n")[0]?.trim();
      if (firstLine && firstLine.length < 60 && !firstLine.endsWith(".")) {
        pageOrSection = firstLine;
      }
    }

    return {
      chunkIndex: idx,
      text: chunkText.trim(),
      pageOrSection,
    };
  });

  return structuredChunks;
}
