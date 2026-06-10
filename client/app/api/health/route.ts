/**
 * GET /api/health
 * Simple health check endpoint.
 * Returns the status of the application.
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
