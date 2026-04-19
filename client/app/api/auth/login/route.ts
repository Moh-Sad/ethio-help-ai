import { cookies } from 'next/headers'
import { authenticateUser } from '@/lib/auth-store'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email?.trim() || !password) {
      return Response.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    const result = await authenticateUser(email, password)
    if ('error' in result) {
      return Response.json({ error: result.error }, { status: 401 })
    }

    const cookieStore = await cookies()
    cookieStore.set('session_id', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return Response.json({ user: result.user })
  } catch {
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
