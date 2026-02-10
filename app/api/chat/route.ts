/**
 * POST /api/chat
 * Main RAG chat endpoint.
 * - Receives user messages
 * - Embeds the latest question
 * - Retrieves relevant chunks from the knowledge store
 * - Streams an AI response grounded in the retrieved context
 */

import {
  streamText,
  convertToModelMessages,
  consumeStream,
  type UIMessage,
} from 'ai'
import { retrieveChunks, getChunkCount } from '@/lib/knowledge-store'
import { generateQueryEmbedding, buildRAGPrompt } from '@/lib/rag'
import { isProcessQuestion, buildProcessPrompt } from '@/lib/agent'

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  // Extract the latest user message text from parts
  const lastUserMessage = messages.filter((m) => m.role === 'user').pop()
  const questionText =
    lastUserMessage?.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') || ''

  // If there are documents in the knowledge base, do RAG retrieval
  let systemPrompt: string

  if (getChunkCount() > 0 && questionText) {
    const queryEmbedding = await generateQueryEmbedding(questionText)
    const relevantChunks = retrieveChunks(queryEmbedding, 4)

    // Use the process prompt if the question is process-related, otherwise use standard RAG
    if (isProcessQuestion(questionText)) {
      systemPrompt = buildProcessPrompt(questionText, relevantChunks)
    } else {
      systemPrompt = buildRAGPrompt(questionText, relevantChunks)
    }
  } else {
    systemPrompt = `You are EthioHelp AI, a helpful assistant for the Ethiopian community. You help with questions about government services, education, health, jobs, and business processes in Ethiopia.

Currently, no documents have been uploaded to the knowledge base yet. You can still try to help with general knowledge, but please let the user know that for the most accurate and specific information, an admin should upload relevant documents through the Admin panel.

Be friendly, helpful, and honest about the limitations of your current knowledge.`
  }

  const result = streamText({
    model: 'openai/gpt-4o-mini',
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}
