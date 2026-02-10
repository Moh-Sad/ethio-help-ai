/**
 * GET /api/health
 * Simple health check endpoint.
 * Returns the status of the application and knowledge base stats.
 */

import { NextResponse } from 'next/server'
import { getDocumentTitles, getChunkCount } from '@/lib/knowledge-store'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    knowledgeBase: {
      documents: getDocumentTitles().length,
      chunks: getChunkCount(),
    },
    timestamp: new Date().toISOString(),
  })
}
