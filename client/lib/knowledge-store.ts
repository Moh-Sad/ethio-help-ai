/**
 * In-memory knowledge store for EthioHelp AI.
 * Stores document chunks with their embeddings for vector similarity search.
 * Uses cosine similarity to find the most relevant chunks for a given query.
 *
 * Note: This store resets on server restart. For production, use a database with pgvector.
 */

export interface DocumentChunk {
  id: string
  title: string
  content: string
  embedding: number[]
  createdAt: Date
}

// Global in-memory store (persists across requests within a single server instance)
const chunks: DocumentChunk[] = []

/**
 * Add chunks with their embeddings to the store
 */
export function addChunks(newChunks: DocumentChunk[]) {
  chunks.push(...newChunks)
}

/**
 * Retrieve the top-k most similar chunks to a query embedding using cosine similarity
 */
export function retrieveChunks(
  queryEmbedding: number[],
  topK = 4
): DocumentChunk[] {
  if (chunks.length === 0) return []

  const scored = chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }))

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, topK).map((s) => s.chunk)
}

/**
 * Get all stored document titles (unique)
 */
export function getDocumentTitles(): string[] {
  const titles = new Set(chunks.map((c) => c.title))
  return Array.from(titles)
}

/**
 * Get total chunk count
 */
export function getChunkCount(): number {
  return chunks.length
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dotProduct / denominator
}
