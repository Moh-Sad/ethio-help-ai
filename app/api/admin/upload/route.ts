/**
 * POST /api/admin/upload
 * Admin endpoint to add documents to the knowledge base.
 * - Validates the admin password
 * - Splits text into chunks
 * - Generates embeddings via AI SDK
 * - Stores chunks in the in-memory knowledge store
 */

import { NextResponse } from 'next/server'
import { splitIntoChunks, generateEmbeddings } from '@/lib/rag'
import { addChunks, type DocumentChunk } from '@/lib/knowledge-store'

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const { title, content, password } = await req.json()

    // Validate admin password
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
    if (password !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid admin password.' },
        { status: 401 }
      )
    }

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
