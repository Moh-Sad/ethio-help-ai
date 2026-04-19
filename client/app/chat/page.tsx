'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Navbar } from '@/components/navbar'
import { ChatMessageList } from '@/components/chat-message-list'
import { ChatInput } from '@/components/chat-input'
import { ChatSidebar } from '@/components/chat-sidebar'
import { useAuth } from '@/components/auth-provider'
import { MessageSquare, PanelLeftOpen } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function ChatPage() {
  const { user, token } = useAuth()
  const [input, setInput] = useState('')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
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

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        prepareSendMessagesRequest: ({ id, messages }) => ({
          body: {
            messages,
            id,
            sessionId: activeSessionId,
          },
        }),
      }),
    [activeSessionId, token]
  )

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
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
    <div className="flex min-h-screen flex-col">
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
        <main className="flex flex-1 flex-col">
          {/* Mobile sidebar toggle */}
          {!sidebarOpen && user && (
            <div className="flex items-center border-b border-border px-4 py-2 lg:hidden">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <PanelLeftOpen className="h-4 w-4" />
                History
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
                Show History
              </button>
            </div>
          )}

          {displayMessages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                Ask EthioHelp AI
              </h2>
              <p className="max-w-md text-center text-sm leading-relaxed text-muted-foreground">
                Ask any question about Ethiopian government services, education,
                health, jobs, or business processes. Try something like:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'How do I get a passport in Ethiopia?',
                  'How can I apply to university?',
                  'What documents are needed to start a business?',
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
            <ChatMessageList messages={displayMessages} isLoading={isLoading} />
          )}

          <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </main>
      </div>
    </div>
  )
}
