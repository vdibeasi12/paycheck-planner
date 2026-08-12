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

    if (!profile) return

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
      ref?: string | null
    }

    if (!profile.utm_source) {
      await supabase
        .from("profiles")
        .update({
          utm_source: attr.source || null,
          utm_medium: attr.medium || null,
          utm_campaign: attr.campaign || null,
          signup_referrer: attr.referrer || null,
        })
        .eq("id", user.id)
    }

    await creditReferralIfPresent(supabase, user.id, attr.ref || null)
  } catch {
    // Attribution is a nice-to-have -- never block a real login over it.
  }
}

// Looks up the referrer by their referral code and records the credit.
// Guards against self-referral and against a user already having a
// referral row (the referrals_referred_id_key unique constraint would
// reject a second one anyway, but checking first avoids a noisy insert
// error on every subsequent login for the same fresh-signup window).
async function creditReferralIfPresent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  refCode: string | null
) {
  if (!refCode) return

  const { data: existing } = await supabase
    .from("referrals")
    .select("id")
    .eq("referred_id", userId)
    .maybeSingle()
  if (existing) return

  const { data: referrer } = await supabase
    .from("profiles")
    .select("id")
    .eq("referral_code", refCode)
    .maybeSingle()
  if (!referrer || referrer.id === userId) return

  await supabase.from("referrals").insert({
    referrer_id: referrer.id,
    referred_id: userId,
    status: "pending",
  })
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
