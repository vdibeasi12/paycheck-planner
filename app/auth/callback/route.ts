import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"

// Reads the first-touch attribution cookie set by AttributionCapture
// (app/components/AttributionCapture.tsx) and attaches it to the profile,
// but only for a genuinely fresh signup -- never overwrites an existing
// user's attribution just because they logged back in via Google.
async function attachAttributionIfFreshSignup(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) return

    const { data: profile } = await supabase
      .from("profiles")
      .select("created_at, utm_source")
      .eq("id", user.id)
      .maybeSingle()

    if (!profile || profile.utm_source) return

    const isFreshSignup =
      profile.created_at &&
      Date.now() - new Date(profile.created_at).getTime() < 10 * 60 * 1000
    if (!isFreshSignup) return

    const cookieStore = await cookies()
    const raw = cookieStore.get("pp_attr")?.value
    if (!raw) return

    const attr = JSON.parse(decodeURIComponent(raw)) as {
      source?: string
      medium?: string
      campaign?: string | null
      referrer?: string | null
    }

    await supabase
      .from("profiles")
      .update({
        utm_source: attr.source || null,
        utm_medium: attr.medium || null,
        utm_campaign: attr.campaign || null,
        signup_referrer: attr.referrer || null,
      })
      .eq("id", user.id)
  } catch {
    // Attribution is a nice-to-have -- never block a real login over it.
  }
}

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

  await attachAttributionIfFreshSignup(supabase)

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
