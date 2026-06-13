/**
 * POST /api/chat
 * Main RAG chat endpoint.
 * - Receives user messages
 * - Implements sliding-window conversational memory:
 *     * Last RECENT_WINDOW_SIZE messages sent verbatim
 *     * Older messages forwarded for server-side Gemini summarization
 * - Embeds the latest question
 * - Retrieves relevant chunks from the knowledge store
 * - Streams an AI response grounded in the retrieved context
 * - Saves messages to backend history if user is authenticated
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Number of recent messages to always send verbatim (must match server config)
const RECENT_WINDOW_SIZE = 6

export const maxDuration = 60

/**
 * Helper to format a UI Message Stream chunk as an SSE line.
 * AI SDK v6 useChat expects: `data: <JSON>\r\n\r\n`
 */
function sseEvent(obj: Record<string, unknown>): string {
  return `data: ${JSON.stringify(obj)}\r\n\r\n`
}

/** Convert an AI SDK message to a plain {role, text} object for the backend */
function toPlainMessage(m: { role: string; parts?: Array<{ type: string; text?: string }>; content?: string }): { role: string; text: string } {
  // AI SDK v6 messages use parts[]; v5 and restored messages may use content
  const text =
    m.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ||
    (typeof m.content === 'string' ? m.content : '') ||
    ''
  return { role: m.role === 'user' ? 'user' : 'assistant', text }
}

export async function POST(req: Request) {
  const { messages, sessionId, language }: {
    messages: Array<{ id: string; role: string; parts?: Array<{ type: string; text?: string }>; content?: string }>
    sessionId?: string
    language?: string
  } = await req.json()

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

  if (!questionText) {
    return new Response('No question provided', { status: 400 })
  }

  // -------------------------------------------------------------------------
  // Sliding Window: split messages into recent (verbatim) vs older (to summarize)
  // -------------------------------------------------------------------------
  // Exclude the very last message (the current question) from history since
  // it's sent separately as `query`.
  const allHistoryMessages = messages.slice(0, -1)
  const plainHistory = allHistoryMessages.map(toPlainMessage)

  let recentMessages: { role: string; text: string }[] = []
  let olderMessages: { role: string; text: string }[] = []

  if (plainHistory.length > RECENT_WINDOW_SIZE) {
    olderMessages = plainHistory.slice(0, plainHistory.length - RECENT_WINDOW_SIZE)
    recentMessages = plainHistory.slice(plainHistory.length - RECENT_WINDOW_SIZE)
  } else {
    recentMessages = plainHistory
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

  // Forward the chat query + conversation memory to the Express backend
  const askRes = await fetch(`${API_URL}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      query: questionText,
      stream: true,
      language: language || 'en',
      recentMessages,
      olderMessages,
    }),
  })

  if (!askRes.ok || !askRes.body) {
    const errorText = await askRes.text()
    return new Response(errorText || 'Backend error', { status: askRes.status || 500 })
  }

  // Transform the Express raw text stream into AI SDK v6 UI Message Stream SSE format.
  // The useChat hook's DefaultChatTransport expects SSE lines with JSON chunks
  // conforming to the uiMessageChunkSchema (text-start, text-delta, text-end, etc.)
  const textPartId = 'text-1'
  let fullResponse = ''

  const transformStream = new TransformStream({
    start(controller) {
      // Emit the stream preamble events
      controller.enqueue(
        new TextEncoder().encode(
          sseEvent({ type: 'start' }) +
          sseEvent({ type: 'start-step' }) +
          sseEvent({ type: 'text-start', id: textPartId })
        )
      )
    },
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk)
      fullResponse += text
      // Emit a text-delta event for each chunk
      controller.enqueue(
        new TextEncoder().encode(
          sseEvent({ type: 'text-delta', id: textPartId, delta: text })
        )
      )
    },
    async flush(controller) {
      // Emit the stream epilogue events
      controller.enqueue(
        new TextEncoder().encode(
          sseEvent({ type: 'text-end', id: textPartId }) +
          sseEvent({ type: 'finish-step' }) +
          sseEvent({ type: 'finish' }) +
          'data: [DONE]\n\n'
        )
      )

      // Save assistant response to backend history
      if (token && activeSessionId && fullResponse) {
        try {
          await fetch(`${API_URL}/history/${activeSessionId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role: 'assistant', text: fullResponse }),
          })
        } catch {
          // Silently fail
        }
      }
    }
  })

  const headers = new Headers()
  headers.set('Content-Type', 'text/event-stream')
  headers.set('Cache-Control', 'no-cache')
  headers.set('Connection', 'keep-alive')
  headers.set('x-vercel-ai-ui-message-stream', 'v1')
  headers.set('x-accel-buffering', 'no')
  if (activeSessionId) {
    headers.set('X-Session-Id', activeSessionId)
  }

  return new Response(askRes.body.pipeThrough(transformStream), {
    headers,
  })
}

