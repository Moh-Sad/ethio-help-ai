import { cookies } from 'next/headers'
import { createUser, authenticateUser } from '@/lib/auth-store'

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name?.trim() || !email?.trim() || !password) {
      return Response.json(
        { error: 'Name, email, and password are required.' },
        { status: 400 }
      )
    }

    const result = await createUser(name, email, password)
    if ('error' in result) {
      return Response.json({ error: result.error }, { status: 400 })
    }

    // Auto-login after signup
    const loginResult = await authenticateUser(email, password)
    if ('error' in loginResult) {
      return Response.json({ error: loginResult.error }, { status: 500 })
    }

    const cookieStore = await cookies()
    cookieStore.set('session_id', loginResult.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return Response.json({ user: loginResult.user })
  } catch {
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
