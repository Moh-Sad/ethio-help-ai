import DocumentChunk from "../models/DocumentChunk.js";

/**
 * Retrieve the most relevant document chunks for a given query embedding.
 * Uses MongoDB Atlas Vector Search when available, falls back to cosine similarity.
 *
 * @param {number[]} queryEmbedding - The embedding vector of the user's query
 * @param {Object} options
 * @param {number} [options.topK=5] - Number of top results to return
 * @param {string} [options.category] - Optional category filter
 * @param {string} [options.language] - Optional language filter
 * @returns {Promise<Array<{title: string, content: string, category: string, language: string, score: number}>>}
 */
export async function search(queryEmbedding, { topK = 5, category, language } = {}) {
  if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
    throw new Error("Query embedding is required");
  }

  const results = await DocumentChunk.vectorSearch(queryEmbedding, {
    topK,
    category,
    language,
  });

  return results;
}

/**
 * Get knowledge base statistics.
 */
export async function getKnowledgeBaseStats() {
  return DocumentChunk.getStats();
}

/**
 * Get all unique document titles.
 */
export async function getDocumentTitles() {
  return DocumentChunk.getDocumentTitles();
}

/**
 * Delete all chunks for a document by title.
 */
export async function deleteDocument(title) {
  return DocumentChunk.deleteByTitle(title);
}

/**
 * Get the total chunk count in the knowledge base.
 */
export async function getChunkCount() {
  return DocumentChunk.countDocuments();
}
