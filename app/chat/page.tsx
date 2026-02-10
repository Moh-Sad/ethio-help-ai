'use client'

import React from "react"

import { useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Navbar } from '@/components/navbar'
import { ChatMessageList } from '@/components/chat-message-list'
import { ChatInput } from '@/components/chat-input'
import { MessageSquare } from 'lucide-react'

export default function ChatPage() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex flex-1 flex-col">
        {messages.length === 0 ? (
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
          <ChatMessageList messages={messages} isLoading={isLoading} />
        )}

        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </main>
    </div>
  )
}
