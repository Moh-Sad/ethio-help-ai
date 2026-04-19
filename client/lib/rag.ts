/**
 * RAG (Retrieval-Augmented Generation) utilities for EthioHelp AI.
 *
 * - splitIntoChunks: splits text into overlapping ~500-word chunks
 * - generateEmbeddings: uses AI SDK embed to get vector embeddings
 * - buildRAGPrompt: constructs a prompt with retrieved context
 */

import { embed, embedMany } from 'ai'

/**
 * Split a document into overlapping chunks of approximately `chunkSize` words.
 * Overlap ensures context is not lost at chunk boundaries.
 */
export function splitIntoChunks(
  text: string,
  chunkSize = 500,
  overlap = 50
): string[] {
  const words = text.split(/\s+/).filter(Boolean)

  if (words.length <= chunkSize) {
    return [words.join(' ')]
  }

  const chunks: string[] = []
  let start = 0

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length)
    chunks.push(words.slice(start, end).join(' '))

    if (end >= words.length) break
    start += chunkSize - overlap
  }

  return chunks
}

/**
 * Generate embeddings for multiple text chunks using the AI SDK
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: 'openai/text-embedding-3-small',
    values: texts,
  })
  return embeddings
}

/**
 * Generate a single embedding for a query string
 */
export async function generateQueryEmbedding(
  query: string
): Promise<number[]> {
  const { embedding } = await embed({
    model: 'openai/text-embedding-3-small',
    value: query,
  })
  return embedding
}

/**
 * Build a RAG prompt with retrieved context chunks
 */
export function buildRAGPrompt(
  question: string,
  contextChunks: { title: string; content: string }[]
): string {
  if (contextChunks.length === 0) {
    return `The user asked: "${question}"

No relevant documents were found in the knowledge base. Please let the user know that you don't have enough information to answer their question accurately, and suggest they check the Admin page to upload relevant documents.`
  }

  const contextText = contextChunks
    .map(
      (chunk, i) =>
        `--- Document: ${chunk.title} (Chunk ${i + 1}) ---\n${chunk.content}`
    )
    .join('\n\n')

  return `You are EthioHelp AI, an assistant for the Ethiopian community. Answer the following question using ONLY the provided context. If the context does not contain enough information, say so honestly.

CONTEXT:
${contextText}

QUESTION: ${question}

INSTRUCTIONS:
- Answer based ONLY on the context above
- If the information is not in the context, say "I don't have enough information about that in my knowledge base."
- Be helpful, clear, and provide step-by-step instructions when applicable
- If the question is about a process, list the steps clearly
- Mention which documents the information came from`
}
