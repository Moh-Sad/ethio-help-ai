'use client'

import React, { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useAuthChat } from '@/hooks/use-auth-chat'
import { Navbar } from '@/components/navbar'
import { ChatMessageList } from '@/components/chat-message-list'
import { ChatInput } from '@/components/chat-input'
import { ChatSidebar } from '@/components/chat-sidebar'
import { useAuth } from '@/components/auth-provider'
import { useLanguage } from '@/components/language-provider'
import { MessageSquare, PanelLeftOpen } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function ChatPage() {
  const { user, token } = useAuth()
  const { language, t } = useLanguage()
  const [input, setInput] = useState('')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Rate limiting states
  const [questionCount, setQuestionCount] = useState(0)
  const [firstQuestionTime, setFirstQuestionTime] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState('')

  // Load rate limits from localStorage on mount & when user logs in/out
  useEffect(() => {
    const key = user ? `ethiohelp-limit-${user.id || 'auth'}` : 'ethiohelp-limit-guest'
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setQuestionCount(parsed.questionCount || 0)
        setFirstQuestionTime(parsed.firstQuestionTime || null)
      } catch (e) {
        localStorage.removeItem(key)
      }
    } else {
      setQuestionCount(0)
      setFirstQuestionTime(null)
    }
  }, [user])

  // Periodic countdown updates for logged-in user limit
  useEffect(() => {
    if (!firstQuestionTime || questionCount < 10 || !user) {
      setTimeRemaining('')
      return
    }

    const updateTime = () => {
      const remainingMs = (firstQuestionTime + 3 * 60 * 60 * 1000) - Date.now()
      if (remainingMs <= 0) {
        // Reset limit
        const key = `ethiohelp-limit-${user.id || 'auth'}`
        localStorage.setItem(key, JSON.stringify({ questionCount: 0, firstQuestionTime: null }))
        setQuestionCount(0)
        setFirstQuestionTime(null)
        setTimeRemaining('')
        return
      }
      const hours = Math.floor(remainingMs / (1000 * 60 * 60))
      const minutes = Math.ceil((remainingMs % (1000 * 60 * 60)) / (1000 * 60))
      if (language === 'am') {
        setTimeRemaining(`${hours} ሰዓት ከ ${minutes} ደቂቃ`)
      } else if (language === 'ar') {
        setTimeRemaining(`${hours} ساعة و ${minutes} دقيقة`)
      } else {
        setTimeRemaining(`${hours}h ${minutes}m`)
      }
    }

    updateTime()
    const interval = setInterval(updateTime, 10000) // update every 10 seconds
    return () => clearInterval(interval)
  }, [firstQuestionTime, questionCount, user, language])
  const [sessions, setSessions] = useState<
    Array<{ id: string; title: string; createdAt: string; updatedAt: string }>
  >([])
  const [restoredMessages, setRestoredMessages] = useState<
    Array<{ id: string; role: 'user' | 'assistant'; parts: Array<{ type: 'text'; text: string }> }>
  >([])

  // Fetch history sessions when user is logged in
  const fetchSessions = useCallback(async () => {
    if (!user || !token) {
      setSessions([])
      return
    }
    try {
      const res = await fetch(`${API_URL}/history`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch {
      // Silently fail
    }
  }, [user, token])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Periodically refresh sessions
  useEffect(() => {
    if (!user || !token) return
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [user, token, fetchSessions])

  const { messages, sendMessage, status, setMessages, error } = useAuthChat({
    token,
    sessionId: activeSessionId,
    language,
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // After first response completes, refresh history to pick up new session
  useEffect(() => {
    if (
      messages.length > 0 &&
      !activeSessionId &&
      user
    ) {
      if (status === 'ready' && messages.length >= 2) {
        fetchSessions()
      }
    }
  }, [messages.length, activeSessionId, user, status, fetchSessions])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const maxAllowed = user ? 10 : 2
    const now = Date.now()

    // Logged-in user limit expiration check (3-hour limit reset)
    if (user && firstQuestionTime && now - firstQuestionTime >= 3 * 60 * 60 * 1000) {
      setQuestionCount(1)
      setFirstQuestionTime(now)
      const key = `ethiohelp-limit-${user.id || 'auth'}`
      localStorage.setItem(key, JSON.stringify({ questionCount: 1, firstQuestionTime: now }))
    } else if (questionCount >= maxAllowed) {
      return
    } else {
      const newCount = questionCount + 1
      let newTime = firstQuestionTime
      if (questionCount === 0) {
        newTime = now
        setFirstQuestionTime(now)
      }
      setQuestionCount(newCount)
      const key = user ? `ethiohelp-limit-${user.id || 'auth'}` : 'ethiohelp-limit-guest'
      localStorage.setItem(key, JSON.stringify({ questionCount: newCount, firstQuestionTime: newTime }))
    }

    sendMessage({ text: input })
    setInput('')
  }

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null)
    setMessages([])
    setRestoredMessages([])
    setSidebarOpen(false)
  }, [setMessages])

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      if (!token) return
      setActiveSessionId(sessionId)
      setSidebarOpen(false)

      try {
        const res = await fetch(`${API_URL}/history/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        })
        const data = await res.json()
        if (data.session?.messages) {
          const converted = data.session.messages.map(
            (m: { id: string; role: string; text: string }) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              parts: [{ type: 'text' as const, text: m.text }],
            })
          )
          setRestoredMessages(converted)
          setMessages(converted)
        }
      } catch {
        // Silently fail
      }
    },
    [token, setMessages]
  )

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (!token) return
      await fetch(`${API_URL}/history/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      fetchSessions()
      if (activeSessionId === sessionId) {
        handleNewChat()
      }
    },
    [token, activeSessionId, handleNewChat, fetchSessions]
  )

  // Combine restored + live messages
  const displayMessages = messages.length > 0 ? messages : restoredMessages

  return (
    <div className="flex h-screen flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* History sidebar */}
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
        />

        {/* Main chat area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile sidebar toggle */}
          {!sidebarOpen && user && (
            <div className="flex items-center border-b border-border px-4 py-2 lg:hidden">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <PanelLeftOpen className="h-4 w-4" />
                {t('chat.history')}
              </button>
            </div>
          )}

          {/* Desktop sidebar toggle */}
          {!sidebarOpen && user && (
            <div className="hidden border-b border-border px-4 py-2 lg:flex">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <PanelLeftOpen className="h-4 w-4" />
                {t('chat.show_history')}
              </button>
            </div>
          )}

          {displayMessages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                {t('chat.ask_title')}
              </h2>
              <p className="max-w-md text-center text-sm leading-relaxed text-muted-foreground">
                {t('chat.ask_subtitle')}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  t('chat.suggestion_1'),
                  t('chat.suggestion_2'),
                  t('chat.suggestion_3'),
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      sendMessage({ text: suggestion })
                    }}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground transition-colors hover:bg-muted"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              <ChatMessageList messages={displayMessages} isLoading={isLoading} />
              {error && (
                <div className="mx-auto my-4 max-w-2xl rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive shadow-sm">
                  <p className="font-semibold">{t('chat.connection_error')}</p>
                  <p>
                    {(() => {
                      let msg = error.message || t('chat.connection_error_desc');
                      try {
                        const parsed = JSON.parse(msg);
                        if (parsed.error) msg = parsed.error;
                      } catch(e) {}
                      return msg;
                    })()}
                  </p>
                </div>
              )}
            </div>
          )}

          {!user && questionCount >= 2 ? (
            <div className="sticky bottom-0 border-t border-border bg-background/80 backdrop-blur-md px-4 py-6">
              <div className="mx-auto max-w-xl rounded-xl border border-primary/20 bg-primary/5 p-5 text-center shadow-sm backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  {language === 'am' ? 'ገደብ ላይ ደርሰዋል' : language === 'ar' ? 'وصلت إلى الحد المسموح به' : 'Limit Reached'}
                </h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  {language === 'am' ? 'እባክዎን ተጨማሪ ጥያቄዎችን ለመጠየቅ ይግቡ ወይም ይመዝገቡ።' : language === 'ar' ? 'يرجى تسجيل الدخول أو إنشاء حساب لمتابعة طرح الأسئلة.' : 'Please log in or sign up to continue asking questions.'}
                </p>
                <div className="flex justify-center gap-3">
                  <Link
                    href="/login"
                    className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    {language === 'am' ? 'ይግቡ' : language === 'ar' ? 'تسجيل الدخول' : 'Log In'}
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-lg border border-input bg-card px-4 py-2 text-xs font-semibold text-card-foreground hover:bg-muted transition-colors shadow-sm"
                  >
                    {language === 'am' ? 'ይመዝገቡ' : language === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <ChatInput
              input={input}
              setInput={setInput}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              disabled={user ? questionCount >= 10 : questionCount >= 2}
              placeholder={
                user && questionCount >= 10
                  ? (language === 'am' ? `ገደብ ላይ ደርሰዋል: በ ${timeRemaining} ውስጥ ይመለሳል` : language === 'ar' ? `تم الوصول للحد: يستعاد خلال ${timeRemaining}` : `Limit reached: restores in ${timeRemaining}`)
                  : undefined
              }
            />
          )}
        </main>
      </div>
    </div>
  )
}
