/**
 * POST /api/chat
 * Main RAG chat endpoint.
 * - Receives user messages
 * - Embeds the latest question
 * - Retrieves relevant chunks from the knowledge store
 * - Streams an AI response grounded in the retrieved context
 * - Saves messages to backend history if user is authenticated
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages, sessionId }: { messages: UIMessage[]; sessionId?: string } =
    await req.json()

  // Extract token from Authorization header
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

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

  // Save user message to backend history if authenticated
  let activeSessionId = sessionId
  if (token && questionText) {
    try {
      if (!activeSessionId) {
        const createRes = await fetch(`${API_URL}/history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: questionText.length > 50 ? `${questionText.slice(0, 50)}...` : questionText,
          }),
        })
        const createData = await createRes.json()
        if (createData.session) {
          activeSessionId = createData.session.id
        }
      }

      if (activeSessionId) {
        await fetch(`${API_URL}/history/${activeSessionId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: 'user', text: questionText }),
        })
      }
    } catch {
      // Silently fail history save
    }
  }

  const result = streamText({
    model: 'openai/gpt-4o-mini',
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
    async onFinish({ text }) {
      // Save assistant response to backend history
      if (token && activeSessionId && text) {
        try {
          await fetch(`${API_URL}/history/${activeSessionId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role: 'assistant', text }),
          })
        } catch {
          // Silently fail
        }
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
