import { NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: authHeader },
    })
    if (!res.ok) {
      return NextResponse.json({ user: null })
    }
    const data = await res.json()
    return NextResponse.json({ user: data.user || null })
  } catch {
    return NextResponse.json({ user: null })
  }
}
