/**
 * In-memory user store for EthioHelp AI authentication.
 * Uses Web Crypto API for password hashing (no native dependencies).
 * Note: Resets on server restart - for production use a database.
 */

import { randomUUID } from 'crypto'

export interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  role: 'user' | 'admin'
  createdAt: Date
}

export interface Session {
  id: string
  userId: string
  expiresAt: Date
}

const users: User[] = []
const sessions: Session[] = []

/**
 * Hash password using SHA-256 with a salt prefix.
 * In production, use bcrypt via a database-backed system.
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomUUID()
  const encoder = new TextEncoder()
  const data = encoder.encode(salt + password)
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${salt}:${hashHex}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt] = stored.split(':')
  const encoder = new TextEncoder()
  const data = encoder.encode(salt + password)
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return stored === `${salt}:${hashHex}`
}

export async function createUser(
  name: string,
  email: string,
  password: string,
  role: 'user' | 'admin' = 'user'
): Promise<{ user: Omit<User, 'passwordHash'> } | { error: string }> {
  const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (existing) {
    return { error: 'An account with this email already exists.' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }

  const passwordHash = await hashPassword(password)
  const user: User = {
    id: randomUUID(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    createdAt: new Date(),
  }

  users.push(user)

  const { passwordHash: _, ...safeUser } = user
  return { user: safeUser }
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ user: Omit<User, 'passwordHash'>; sessionId: string } | { error: string }> {
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim())
  if (!user) {
    return { error: 'Invalid email or password.' }
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return { error: 'Invalid email or password.' }
  }

  const session: Session = {
    id: randomUUID(),
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  }
  sessions.push(session)

  const { passwordHash: _, ...safeUser } = user
  return { user: safeUser, sessionId: session.id }
}

export function getSessionUser(
  sessionId: string
): Omit<User, 'passwordHash'> | null {
  const session = sessions.find(
    (s) => s.id === sessionId && s.expiresAt > new Date()
  )
  if (!session) return null

  const user = users.find((u) => u.id === session.userId)
  if (!user) return null

  const { passwordHash: _, ...safeUser } = user
  return safeUser
}

export function deleteSession(sessionId: string): void {
  const index = sessions.findIndex((s) => s.id === sessionId)
  if (index !== -1) sessions.splice(index, 1)
}
