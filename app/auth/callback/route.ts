import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // Surface the real reason instead of silently bouncing home.
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  // On Vercel the incoming request host can be an internal address. Trust the
  // forwarded host so the just-set session cookie (scoped to the public
  // domain) is actually sent on the redirect to /dashboard.
  const forwardedHost = request.headers.get("x-forwarded-host")
  const isLocal = process.env.NODE_ENV === "development"
  const base = isLocal
    ? origin
    : forwardedHost
    ? `https://${forwardedHost}`
    : origin

  return NextResponse.redirect(`${base}${next}`)
}
