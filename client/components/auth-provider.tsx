'use client'

import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react'

interface AuthUser {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ error?: string }>
  signup: (name: string, email: string, password: string) => Promise<{ error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('ethiohelp_token') : null
    if (savedToken) {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
        credentials: 'include',
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.user) {
            setUser(data.user)
            setToken(savedToken)
          } else {
            localStorage.removeItem('ethiohelp_token')
          }
        })
        .catch(() => {
          localStorage.removeItem('ethiohelp_token')
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) return { error: data.error || 'Login failed.' }

      setUser(data.user)
      setToken(data.token)
      localStorage.setItem('ethiohelp_token', data.token)
      return {}
    } catch {
      return { error: 'Network error. Please try again.' }
    }
  }, [])

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) return { error: data.error || 'Signup failed.' }

      setUser(data.user)
      setToken(data.token)
      localStorage.setItem('ethiohelp_token', data.token)
      return {}
    } catch {
      return { error: 'Network error. Please try again.' }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      })
    } catch {
      // Silently fail
    }
    setUser(null)
    setToken(null)
    localStorage.removeItem('ethiohelp_token')
  }, [token])

  const value = useMemo(
    () => ({ user, token, isLoading, login, signup, logout }),
    [user, token, isLoading, login, signup, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
