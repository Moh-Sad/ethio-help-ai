import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the token from cookies
  const token = request.cookies.get('auth-token')?.value
  
  // Clone the request headers
  const requestHeaders = new Headers(request.headers)
  
  // Add the Authorization header if token exists
  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }
  
  // Create a response with the modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  
  return response
}

// Specify which routes this middleware applies to
export const config = {
  matcher: ['/api/:path*'],
}
