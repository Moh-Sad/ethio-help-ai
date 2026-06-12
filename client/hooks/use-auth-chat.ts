import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useMemo } from 'react'

interface UseAuthChatOptions {
  token?: string | null
  sessionId?: string | null
  language?: string
}

/**
 * Custom hook that wraps useChat with authentication headers, session ID, and language.
 */
export function useAuthChat({ token, sessionId, language }: UseAuthChatOptions = {}) {
  const transport = useMemo(() => {
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    
    const body: Record<string, any> = {}
    if (sessionId) {
      body.sessionId = sessionId
    }
    if (language) {
      body.language = language
    }

    return new DefaultChatTransport({
      api: '/api/chat',
      headers,
      body
    })
  }, [token, sessionId, language])

  return useChat({
    transport,
    onError: (err) => {
      console.error('Chat error:', err)
    },
  })
}
