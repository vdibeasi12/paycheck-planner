import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes that require a logged-in user. Anything not listed stays public
// (home, /login, /signup, /pricing, /features, marketing pages, etc.).
const PROTECTED = [
  "/dashboard",
  "/admin",
  "/debts",
  "/bills",
  "/analytics",
  "/ai-chat",
  "/ai-advisor",
  "/ai-recommendations",
  "/onboarding",
  "/report",
  "/debt-payoff-calculator",
  "/documents",
  "/goals",
  "/account",
  "/insights",
  "/mfa",
]

// Reads the `aal` claim from a Supabase access token (JWT) with no network
// call. base64url-decoded in the Edge runtime via atob. Returns null on any
// problem so the caller falls back to the authoritative network check.
function getAalClaim(token?: string): string | null {
  if (!token) return null
  try {
    const part = token.split(".")[1]
    if (!part) return null
    let b64 = part.replace(/-/g, "+").replace(/_/g, "/")
    while (b64.length % 4) b64 += "="
    const obj = JSON.parse(atob(b64))
    return typeof obj.aal === "string" ? obj.aal : null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  // Start with a pass-through response we can attach refreshed cookies to.
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: this call refreshes the auth session on every request and
  // writes the refreshed cookies onto `response`. This is what keeps users
  // logged in reliably in the wrapped mobile app.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = PROTECTED.some(
    (p) => path === p || path.startsWith(p + "/")
  )

  // Logged-in users shouldn't land on the marketing home page (it reads as
  // "login didn't work"). Send them straight into the app.
  if (user && path === "/") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirectTo", path)
    return NextResponse.redirect(url)
  }

  // MFA enforcement: a logged-in user with a verified second factor whose
  // session is still AAL1 must complete the step-up challenge before reaching
  // any protected route. /mfa itself is exempt to avoid a redirect loop.
  if (user && isProtected && path !== "/mfa") {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token

    // The JWT `aal` claim is authoritative for "has this session stepped up?":
    //   aal2 -> already verified this session, let them through.
    //   aal1 -> only force /mfa if the user actually has a verified factor to
    //           challenge against (otherwise there is nothing to step up to and
    //           we would bounce them into a dead end).
    // We deliberately do NOT call getAuthenticatorAssuranceLevel() here: in a
    // fresh per-request Edge client it cannot resolve `nextLevel` and always
    // reports aal1/aal1, so the step-up redirect never fired.
    if (getAalClaim(token) === "aal1") {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const hasVerifiedFactor =
        !!factors &&
        Array.isArray(factors.all) &&
        factors.all.some((f) => f.status === "verified")
      if (hasVerifiedFactor) {
        const url = request.nextUrl.clone()
        url.pathname = "/mfa"
        url.searchParams.set("redirectTo", path)
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}

export const config = {
  // Run on everything EXCEPT static assets and the Stripe webhook
  // (the webhook must never be redirected or session-checked).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}