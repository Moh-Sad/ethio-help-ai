import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useMemo } from 'react'

interface UseAuthChatOptions {
  token?: string | null
  sessionId?: string | null
}

/**
 * Custom hook that wraps useChat with authentication headers and session ID.
 */
export function useAuthChat({ token, sessionId }: UseAuthChatOptions = {}) {
  const transport = useMemo(() => {
    const headers: Record<string, string> = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    
    const body: Record<string, any> = {}
    if (sessionId) {
      body.sessionId = sessionId
    }

    return new DefaultChatTransport({
      api: '/api/chat',
      headers,
      body
    })
  }, [token, sessionId])

  return useChat({
    transport,
    onError: (err) => {
      console.error('Chat error:', err)
    },
  })
}
