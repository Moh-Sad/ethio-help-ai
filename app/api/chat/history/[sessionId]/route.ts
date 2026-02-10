/**
 * GET /api/chat/history/[sessionId] - Get full session with messages
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-store'
import { getSession } from '@/lib/chat-history'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const cookieStore = await cookies()
  const sid = cookieStore.get('session_id')?.value
  if (!sid) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  const user = getSessionUser(sid)
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  const session = getSession(sessionId, user.id)
  if (!session) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
  }
  return NextResponse.json({ session })
}
