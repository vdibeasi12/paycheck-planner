import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Public paths that don't require authentication
  const publicPaths = [
    "/",
    "/login",
    "/signup",
    "/pricing",
    "/terms",
    "/privacy",
    "/disclaimer",
    "/forgot-password",
    "/reset-password",
  ]

  // Check if current path is public
  const isPublic = publicPaths.some((path) => {
    if (path === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(path)
  })

  // Allow public paths without authentication
  if (isPublic) {
    return NextResponse.next()
  }

  // Check for authentication
  // Look for Supabase session token in cookies
  const token = req.cookies.get("sb-auth-token")?.value ||
                req.cookies.get("sb-access-token")?.value

  if (!token) {
    // Redirect to login if not authenticated
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("redirectedFrom", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    // Match all paths except:
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}