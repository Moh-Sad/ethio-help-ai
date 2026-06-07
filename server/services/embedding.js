import axios from "axios";

/**
 * Generate an embedding vector for a single text string.
 * Uses OpenAI text-embedding-3-small (1536 dimensions).
 * This model has good multilingual support including Amharic and Arabic.
 *
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} The embedding vector (1536 dimensions)
 */
export async function getEmbedding(text) {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Text is required for embedding generation");
  }

  const res = await axios.post(
    "https://api.openai.com/v1/embeddings",
    {
      model: "text-embedding-3-small",
      input: text.trim(),
    },
    { 
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  return res.data.data[0].embedding;
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

  // OpenAI supports batch embedding (up to ~8191 tokens per input)
  const res = await axios.post(
    "https://api.openai.com/v1/embeddings",
    {
      model: "text-embedding-3-small",
      input: texts.map((t) => t.trim()),
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  // Sort by index to ensure correct ordering
  const sorted = res.data.data.sort((a, b) => a.index - b.index);
  return sorted.map((item) => item.embedding);
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