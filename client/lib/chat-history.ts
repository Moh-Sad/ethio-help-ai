/**
 * In-memory chat history store for EthioHelp AI.
 * Stores conversation sessions per user so they can resume and browse past chats.
 * Note: Resets on server restart - for production use a database.
 */

import { randomUUID } from 'crypto'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
}

export interface ChatSession {
  id: string
  userId: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

const sessions: ChatSession[] = []

/** Create a new chat session */
export function createSession(userId: string, title: string): ChatSession {
  const now = new Date().toISOString()
  const session: ChatSession = {
    id: randomUUID(),
    userId,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
  sessions.push(session)
  return session
}

/** Get all sessions for a user, newest first */
export function getUserSessions(userId: string): Omit<ChatSession, 'messages'>[] {
  return sessions
    .filter((s) => s.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map(({ messages: _, ...rest }) => rest)
}

/** Get a specific session with its messages */
export function getSession(sessionId: string, userId: string): ChatSession | null {
  return sessions.find((s) => s.id === sessionId && s.userId === userId) ?? null
}

/** Add a message to a session */
export function addMessage(
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant',
  text: string
): ChatMessage | null {
  const session = sessions.find((s) => s.id === sessionId && s.userId === userId)
  if (!session) return null

  const message: ChatMessage = {
    id: randomUUID(),
    role,
    text,
    createdAt: new Date().toISOString(),
  }
  session.messages.push(message)
  session.updatedAt = new Date().toISOString()

  // Auto-update session title from first user message
  if (session.messages.length === 1 && role === 'user') {
    session.title = text.length > 50 ? `${text.slice(0, 50)}...` : text
  }

  return message
}

/** Delete a session */
export function deleteSession(sessionId: string, userId: string): boolean {
  const index = sessions.findIndex((s) => s.id === sessionId && s.userId === userId)
  if (index === -1) return false
  sessions.splice(index, 1)
  return true
}
