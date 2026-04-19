/**
 * GET /api/chat/history/[sessionId] - Get full session with messages
 */

import { NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const token = req.headers.get('authorization')?.replace('Bearer ', '') || ''

  if (!token) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  try {
    const res = await fetch(`${API_URL}/history/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
