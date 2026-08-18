import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { safeRedirect } from "@/lib/safeRedirect"

// Sign-out bug fix (Aug 18 2026): sign-out used to happen entirely
// client-side, scattered across six different components (Sidebar.tsx,
// AppNav.tsx, app/account/page.tsx, app/mfa/page.tsx,
// app/mfa/setup/page.tsx, DeleteAccount.tsx), each with its own copy of
// `await supabase.auth.signOut()` followed by some client-side redirect.
// Two real problems with that pattern, either of which reproduces "signed
// out, but the app chrome and every protected page are still fully
// reachable":
//
//   1. app/account/page.tsx's copy used router.push("/login") -- a soft,
//      client-side-only navigation. Next.js's App Router does NOT re-run
//      the root layout (app/layout.tsx) on a soft navigation, so the
//      already-mounted Sidebar (rendered back when the user really was
//      logged in) simply stays on screen with its stale state, regardless
//      of whether the sign-out itself succeeded. Its links are real
//      next/link components, so clicking them "worked" via the client
//      router's own prefetch/payload cache for pages visited moments
//      earlier, without necessarily re-checking the server at all.
//
//   2. Even the copies that *did* do a hard navigation
//      (window.location.href / .assign) were still racy: the browser
//      client's signOut() clears its session cookies via document.cookie
//      writes, which only happen once GoTrueClient's internal _signOut()
//      fully resolves -- and _signOut() awaits a network call to
//      Supabase's own /auth/v1/logout endpoint first. If that call is
//      slow, rate-limited, or returns certain non-2xx errors, _signOut()
//      can resolve *without* ever clearing the local session, without
//      throwing. The subsequent hard navigation then fires with the old
//      session cookies still fully valid, and middleware.ts's
//      supabase.auth.getUser() call (which also refreshes/re-writes
//      session cookies on every request) happily re-authenticates it.
//
// Routing every sign-out through this one server-side handler fixes both:
// it's always a real <form> POST (a genuine top-level browser navigation,
// so the root layout always re-runs), and the session-cookie teardown
// (via createClient()'s cookies().set() calls -- which work in a Route
// Handler, unlike in a Server Component) and the redirect are part of the
// exact same HTTP response, so the browser cannot possibly request the next
// page with the old cookies still attached.
export async function POST(request: Request) {
  const supabase = await createClient()
  try {
    await supabase.auth.signOut()
  } catch {
    // Never let a flaky/slow call to Supabase's logout endpoint strand the
    // user on the current page -- the cookie-clearing below (via
    // supabase.auth.signOut()'s local cleanup, already attempted above) and
    // the redirect are what actually matter for getting them out.
  }

  const formData = await request.formData().catch(() => null)
  const next = safeRedirect(
    (formData?.get("next") as string | null) ?? null,
    "/login"
  )
  return NextResponse.redirect(new URL(next, request.url), { status: 303 })
}

// A GET here (stray bookmark, someone typing the URL, a cross-site <img>/
// <a> "logout CSRF" attempt) is intentionally NOT wired to sign anyone out
// -- sign-out is POST-only. This just sends a GET to the login page instead
// of a bare 405, since a mistyped/bookmarked URL shouldn't dead-end.
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/login", request.url))
}
