import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Routes that require a logged-in user. Anything not listed stays public
// (home, /login, /signup, /pricing, /features, marketing pages, etc.).
const PROTECTED = [
  "/dashboard",
  "/admin",
  "/debts",
  "/bills",
  "/income",
  "/analytics",
  "/ai-chat",
  "/ai-advisor",
  "/ai-recommendations",
  "/onboarding",
  "/report",
  "/debt-payoff-calculator",
  "/documents",
  "/goals",
  "/survival-mode",
  "/achievements",
  "/account",
  "/insights",
  "/mfa",
]

// MFA (AAL2) is deliberately NOT enforced page-by-page here. It's required
// in exactly two places instead: the login-time challenge for anyone who
// already has a verified factor (see app/login/page.tsx), and connecting a
// bank account -- the single most sensitive action in the app -- which is
// gated server-side in app/api/plaid/link-token/route.ts and
// app/api/plaid/exchange/route.ts (checkAal2Status), independent of which
// page the request came from. Visiting /admin, /account, or /documents no
// longer force-walls a signed-in user into MFA setup just to look around.

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Forwarded through to Server Components -- the root layout (app/layout.tsx)
  // needs to know the current route (to suppress the sidebar/chrome padding
  // on /mfa pages), and a Server Component otherwise has no way to read the
  // pathname. QA fix, Aug 15 2026: without this, a not-yet-MFA-enrolled user
  // sent to /mfa/setup saw the same off-center bug previously fixed for the
  // /mfa challenge page, because the layout had no way to know it should
  // suppress the sidebar padding there. Mutated in place (rather than a
  // separate Headers snapshot) so it survives alongside the session-cookie
  // refresh below, which mutates this same `request` object.
  request.headers.set("x-pathname", path)

  // Start with a pass-through response we can attach refreshed cookies to.
  let response = NextResponse.next({ request: { headers: request.headers } })

  // Any time we redirect below, the redirect must carry whatever cookies
  // got attached to `response` (e.g. a session token refreshed moments ago
  // by getUser()/getSession() during this same request). A bare
  // NextResponse.redirect() does NOT inherit those -- that gap was the
  // root cause of the intermittent "signed in, then bounced back out"
  // behavior right after OAuth login.
  function redirect(url: URL) {
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

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

  const isProtected = PROTECTED.some(
    (p) => path === p || path.startsWith(p + "/")
  )

  // Logged-in users shouldn't land on the marketing home page (it reads as
  // "login didn't work"). Send them straight into the app.
  if (user && path === "/") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return redirect(url)
  }

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirectTo", path)
    return redirect(url)
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