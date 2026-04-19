/**
 * GET /api/admin/documents
 * Returns the list of uploaded document titles and total chunk count.
 */

import { NextResponse } from 'next/server'
import { getDocumentTitles, getChunkCount } from '@/lib/knowledge-store'

export async function GET() {
  return NextResponse.json({
    titles: getDocumentTitles(),
    totalChunks: getChunkCount(),
  })
}
