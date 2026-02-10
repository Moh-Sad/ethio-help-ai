/**
 * POST /api/chat
 * Main RAG chat endpoint.
 * - Receives user messages
 * - Embeds the latest question
 * - Retrieves relevant chunks from the knowledge store
 * - Streams an AI response grounded in the retrieved context
 */

import { cookies } from 'next/headers'
import {
  streamText,
  convertToModelMessages,
  consumeStream,
  type UIMessage,
} from 'ai'
import { retrieveChunks, getChunkCount } from '@/lib/knowledge-store'
import { generateQueryEmbedding, buildRAGPrompt } from '@/lib/rag'
import { isProcessQuestion, buildProcessPrompt } from '@/lib/agent'
import { getSessionUser } from '@/lib/auth-store'
import { addMessage, createSession } from '@/lib/chat-history'

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages, sessionId }: { messages: UIMessage[]; sessionId?: string } =
    await req.json()

  // Determine current user for history tracking
  const cookieStore = await cookies()
  const authSessionId = cookieStore.get('session_id')?.value
  const user = authSessionId ? getSessionUser(authSessionId) : null

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

  // Save user message to history if logged in
  let activeSessionId = sessionId
  if (user && questionText) {
    if (!activeSessionId) {
      const session = createSession(user.id, questionText.length > 50 ? `${questionText.slice(0, 50)}...` : questionText)
      activeSessionId = session.id
    }
    addMessage(activeSessionId, user.id, 'user', questionText)
  }

  const result = streamText({
    model: 'openai/gpt-4o-mini',
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
    async onFinish({ text }) {
      // Save assistant response to history
      if (user && activeSessionId && text) {
        addMessage(activeSessionId, user.id, 'assistant', text)
      }
    },
  })

  const headers: Record<string, string> = {}
  if (activeSessionId) {
    headers['X-Session-Id'] = activeSessionId
  }

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
    headers,
  })
}
