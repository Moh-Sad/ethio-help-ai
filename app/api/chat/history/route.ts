/**
 * GET /api/chat/history - List all chat sessions for the signed-in user
 * POST /api/chat/history - Create a new chat session
 * DELETE /api/chat/history?id=xxx - Delete a chat session
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-store'
import {
  getUserSessions,
  createSession,
  deleteSession,
} from '@/lib/chat-history'

async function getUser() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value
  if (!sessionId) return null
  return getSessionUser(sessionId)
}

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ sessions: [] })
  }
  const sessions = getUserSessions(user.id)
  return NextResponse.json({ sessions })
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  const { title } = await req.json()
  const session = createSession(user.id, title || 'New Chat')
  return NextResponse.json({ session })
}

export async function DELETE(req: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing session id.' }, { status: 400 })
  }
  deleteSession(id, user.id)
  return NextResponse.json({ ok: true })
}
