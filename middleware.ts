import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Get the path of the request
  const path = request.nextUrl.pathname
  console.log("Middleware processing path:", path)

  // Define public paths that don't require authentication
  const isPublicPath = path === "/" || 
    path === "/login" || 
    path === "/signup" || 
    path === "/forgot-password" || 
    path === "/reset-password" ||
    path === "/verify-email" ||
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.endsWith(".svg") ||
    path.endsWith(".ico") ||
    path.endsWith(".png")

  // Log all cookies for debugging
  const allCookies = request.cookies.getAll()
  console.log("All cookies:", allCookies.map(c => c.name))

  // Check for the drinfo-session cookie which indicates authentication
  const authCookie = request.cookies.get('drinfo-session')
  const hasAuthCookie = !!authCookie
  
  console.log("Auth cookie found:", hasAuthCookie)
  if (hasAuthCookie) {
    console.log("Auth cookie value:", authCookie.value)
  }

  // If the user is authenticated and trying to access login/signup, redirect to dashboard
  if (hasAuthCookie && isPublicPath && !path.startsWith("/_next") && !path.startsWith("/api")) {
    console.log("User is authenticated, redirecting to dashboard from:", path)
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // If the user is not authenticated and trying to access a protected route, redirect to login
  if (!hasAuthCookie && !isPublicPath) {
    console.log("User not authenticated, redirecting to login from:", path)
    return NextResponse.redirect(new URL("/login", request.url))
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
     * - forgot-password (password reset flow)
     * - reset-password (password reset flow)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|forgot-password|reset-password).*)',
  ],
}
