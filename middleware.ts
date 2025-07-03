import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Get the path of the request
  const path = request.nextUrl.pathname

  // Define public paths that don't require authentication
  const isPublicPath = path === "/" || 
    path === "/login" || 
    path === "/signup" || 
    path === "/forgot-password" || 
    path.startsWith("/reset-password") ||
    path.startsWith("/dashboard/public/") || // Allow access to public shared chats
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.endsWith(".svg") ||
    path.endsWith(".ico") ||
    path.endsWith(".png")

  // Special case for verify-email: always allow access regardless of auth state
  if (path === "/verify-email") {
    return NextResponse.next()
  }

  // Check for the drinfo-session cookie which indicates authentication
  const authCookie = request.cookies.get('drinfo-session')
  let hasValidAuthCookie = false
  
  if (authCookie) {
    // Try to validate the cookie content
    try {
      const sessionData = JSON.parse(authCookie.value || '{}')
      // Check if the session has required fields and isn't too old
      if (sessionData.uid && sessionData.email && sessionData.timestamp) {
        const age = Date.now() - sessionData.timestamp
        const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
        
        if (age < maxAge) {
          hasValidAuthCookie = true
        }
      }
    } catch (error) {
      // Invalid cookie, treat as unauthenticated
    }
  }

  // Only redirect to login for truly protected routes
  // Let client-side auth handle most auth logic to prevent race conditions
  if (!hasValidAuthCookie && !isPublicPath) {
    // Remove onboarding from critical paths - let AuthProvider handle it
    const criticalProtectedPaths: string[] = [] // Remove '/onboarding' from here
    const isCriticalPath = criticalProtectedPaths.some(criticalPath => path.startsWith(criticalPath))
    
    if (isCriticalPath) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    
    // For all other protected paths including onboarding, let client-side handle it
    return NextResponse.next()
  }

  // For all other cases, proceed with the request
  return NextResponse.next()
}

// Configure the middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - verify-email (email verification flow)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|verify-email).*)',
  ],
}
