import { cookies } from 'next/headers'
import { getSessionUser } from '@/lib/auth-store'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return Response.json({ user: null })
    }

    const user = getSessionUser(sessionId)
    return Response.json({ user: user || null })
  } catch {
    return Response.json({ user: null })
  }
}
