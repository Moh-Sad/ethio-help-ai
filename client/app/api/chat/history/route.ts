/**
 * GET /api/chat/history - List all chat sessions for the signed-in user
 * POST /api/chat/history - Create a new chat session
 * DELETE /api/chat/history?id=xxx - Delete a chat session
 */

import { NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken(req: Request): string {
  return req.headers.get('authorization')?.replace('Bearer ', '') || ''
}

export async function GET(req: Request) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ sessions: [] })

  try {
    const res = await fetch(`${API_URL}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ sessions: [] })
  }
}

export async function POST(req: Request) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  try {
    const body = await req.json()
    const res = await fetch(`${API_URL}/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const token = getToken(req)
  if (!token) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing session id.' }, { status: 400 })

  try {
    const res = await fetch(`${API_URL}/history/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
