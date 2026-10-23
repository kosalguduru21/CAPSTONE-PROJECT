import { extractText } from "unpdf";

/**
 * Creates an HTTP-friendly error.
 */
function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Remove common extraction noise while preserving paragraphs and the meaning of the content.
 */
function cleanExtractedText(text) {
  return text
    .replace(/\u0000|\uFEFF/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/\.{3,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/(?:\.[ \t]*){3,}/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract text from a PDF buffer using unpdf.
 */
async function extractPdfText(fileBuffer) {
  const pdfData = new Uint8Array(fileBuffer);
  const { text, totalPages } = await extractText(pdfData, {
    mergePages: true,
  });

  return { text, totalPages: totalPages || 1 };
}

/**
 * Extract and clean text from an uploaded PDF or TXT file.
 */
export async function extractTextFromFile(fileBuffer, mimeType) {
  if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw createError("A valid, non-empty file buffer is required", 400);
  }

  if (typeof mimeType !== "string" || mimeType.trim() === "") {
    throw createError("File MIME type is required", 400);
  }

  let extractedRawText = "";
  let pageCount = 1;

  switch (mimeType) {
    case "application/pdf": {
      const result = await extractPdfText(fileBuffer);
      extractedRawText = result.text;
      pageCount = result.totalPages;
      break;
    }

    case "text/plain": {
      extractedRawText = fileBuffer.toString("utf8");
      pageCount = 1;
      break;
    }

    default:
      throw createError(
        "Unsupported file type for document ingestion. Only PDF and TXT files are supported.",
        415,
      );
  }

  const cleanedText = cleanExtractedText(extractedRawText);

  if (!cleanedText) {
    throw createError("No readable text was found in the uploaded file", 422);
  }

  return {
    cleanedText,
    pageCount,
    rawLength: extractedRawText.length,
  };
}
