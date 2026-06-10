import { GoogleGenerativeAI } from "@google/generative-ai";

const getGenAI = () => new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate an embedding vector for a single text string.
 * Uses Google Gemini gemini-embedding-2, leveraging Matryoshka Representation Learning
 * to slice the 3072-dimensional vector down to 1536 dimensions.
 *
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} The embedding vector (1536 dimensions)
 */
export async function getEmbedding(text) {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Text is required for embedding generation");
  }

  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
  const result = await model.embedContent(text.trim());
  
  let vector = result.embedding.values;
  
  // Slice to 1536 dimensions using Matryoshka Representation Learning properties
  if (vector.length > 1536) {
    vector = vector.slice(0, 1536);
  }
  
  return vector;
}

/**
 * Generate embeddings for multiple text strings in a single batch.
 * More efficient than calling getEmbedding() multiple times.
 *
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
export async function getEmbeddings(texts) {
  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    throw new Error("Texts array is required for batch embedding generation");
  }

  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
  
  const requests = texts.map((t) => ({
    content: { role: "user", parts: [{ text: t.trim() }] },
  }));

  const result = await model.batchEmbedContents({ requests });
  
  return result.embeddings.map((e) => {
    let vector = e.values;
    // Slice to 1536 dimensions using Matryoshka Representation Learning properties
    if (vector.length > 1536) {
      vector = vector.slice(0, 1536);
    }
    return vector;
  });
}

/**
 * Split text into overlapping chunks of approximately `chunkSize` words.
 * Overlap ensures context is not lost at chunk boundaries.
 *
 * @param {string} text - The full document text
 * @param {number} [chunkSize=500] - Approximate words per chunk
 * @param {number} [overlap=50] - Words of overlap between chunks
 * @returns {string[]} Array of text chunks
 */
export function splitIntoChunks(text, chunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length <= chunkSize) {
    return [words.join(" ")];
  }

  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));

    if (end >= words.length) break;
    start += chunkSize - overlap;
  }

  return chunks;
}