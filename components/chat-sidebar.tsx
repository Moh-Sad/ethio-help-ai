'use client'

import { formatDistanceToNow } from '@/lib/date-utils'
import { useAuth } from '@/components/auth-provider'
import {
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  LogIn,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface HistorySession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

interface ChatSidebarProps {
  sessions: HistorySession[]
  activeSessionId: string | null
  onNewChat: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  isOpen: boolean
  onToggle: () => void
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  isOpen,
  onToggle,
}: ChatSidebarProps) {
  const { user } = useAuth()

  return (
    <>
      {/* Toggle button when sidebar is closed */}
      {!isOpen && (
        <button
          type="button"
          onClick={onToggle}
          className="fixed left-3 top-[4.5rem] z-40 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open chat history"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      {/* Overlay on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
          onKeyDown={(e) => e.key === 'Escape' && onToggle()}
          role="button"
          tabIndex={-1}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-[57px] z-50 flex h-[calc(100vh-57px)] w-72 flex-col border-r border-border bg-card transition-transform duration-200 lg:relative lg:top-0 lg:z-auto lg:h-auto lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-3">
          <h2 className="text-sm font-semibold text-card-foreground">
            Chat History
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onNewChat}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="New chat"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggle}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-2">
          {!user ? (
            <div className="flex flex-col items-center gap-3 px-3 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <LogIn className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Sign in to save and view your chat history
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </Link>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No conversations yet
              </p>
              <p className="text-xs text-muted-foreground/70">
                Start a new chat to see your history here
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    'group flex items-start gap-2 rounded-lg px-3 py-2.5 transition-colors',
                    activeSessionId === session.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-card-foreground hover:bg-muted'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectSession(session.id)}
                    className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                  >
                    <span className="w-full truncate text-sm font-medium">
                      {session.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(session.updatedAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSession(session.id)
                    }}
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-all hover:bg-accent/10 hover:text-accent group-hover:opacity-100"
                    aria-label={`Delete chat: ${session.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
