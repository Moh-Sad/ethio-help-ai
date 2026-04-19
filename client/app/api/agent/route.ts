/**
 * POST /api/agent
 * Process helper agent endpoint.
 * Detects process-style questions and returns structured step-by-step guides
 * with required document checklists. Falls back to standard RAG for non-process queries.
 */

import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { retrieveChunks, getChunkCount } from '@/lib/knowledge-store'
import { generateQueryEmbedding, buildRAGPrompt } from '@/lib/rag'
import { isProcessQuestion, buildProcessPrompt } from '@/lib/agent'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { message } = await req.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required.' },
        { status: 400 }
      )
    }

    // Determine if this is a process question
    const isProcess = isProcessQuestion(message)

    // Retrieve relevant context if knowledge base has documents
    let relevantChunks: { title: string; content: string }[] = []

    if (getChunkCount() > 0) {
      const queryEmbedding = await generateQueryEmbedding(message)
      relevantChunks = retrieveChunks(queryEmbedding, 4)
    }

    // Build the appropriate prompt
    const prompt = isProcess
      ? buildProcessPrompt(message, relevantChunks)
      : buildRAGPrompt(message, relevantChunks)

    // Generate the response
    const result = await generateText({
      model: 'openai/gpt-4o-mini',
      prompt,
    })

    // Extract source document titles
    const sources = [
      ...new Set(relevantChunks.map((c) => c.title)),
    ]

    return NextResponse.json({
      reply: result.text,
      isProcess,
      sources,
    })
  } catch (error) {
    console.error('Agent error:', error)
    return NextResponse.json(
      { error: 'Failed to process request.' },
      { status: 500 }
    )
  }
}
