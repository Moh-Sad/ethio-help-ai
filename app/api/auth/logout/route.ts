import { cookies } from 'next/headers'
import { deleteSession } from '@/lib/auth-store'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (sessionId) {
      deleteSession(sessionId)
    }

    cookieStore.delete('session_id')

    return Response.json({ success: true })
  } catch {
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
