/**
 * POST /api/admin/upload
 * Admin endpoint to add documents to the knowledge base.
 * - Validates the user session via cookie
 * - Splits text into chunks
 * - Generates embeddings via AI SDK
 * - Stores chunks in the in-memory knowledge store
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth-store'
import { splitIntoChunks, generateEmbeddings } from '@/lib/rag'
import { addChunks, type DocumentChunk } from '@/lib/knowledge-store'

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    // Validate session
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value
    if (!sessionId || !getSessionUser(sessionId)) {
      return NextResponse.json(
        { error: 'You must be signed in to upload documents.' },
        { status: 401 }
      )
    }

    const { title, content } = await req.json()

    // Validate inputs
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document title is required.' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document content is required.' },
        { status: 400 }
      )
    }

    // Split document into chunks (~500 words each)
    const textChunks = splitIntoChunks(content.trim(), 500, 50)

    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(textChunks)

    // Create document chunk objects
    const documentChunks: DocumentChunk[] = textChunks.map((text, i) => ({
      id: `${Date.now()}-${i}`,
      title: title.trim(),
      content: text,
      embedding: embeddings[i],
      createdAt: new Date(),
    }))

    // Store in the knowledge base
    addChunks(documentChunks)

    return NextResponse.json({
      success: true,
      message: `Document "${title.trim()}" indexed successfully.`,
      chunksCreated: documentChunks.length,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process document. Please try again.' },
      { status: 500 }
    )
  }
}
