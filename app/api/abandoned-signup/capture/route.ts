import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { checkAnonRateLimit, getClientIp } from "@/lib/anonRateLimit"
import { track } from "@/lib/track"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, key, { auth: { persistSession: false } })
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Fired (fire-and-forget) from app/signup/page.tsx on email-field blur --
// before the person ever submits the signup form. Lets us send a recovery
// nudge (lib/abandoned-signup-sequence.ts) if they never come back to
// finish. Always no-ops silently on error: this must never block or
// interfere with the actual signup flow.
export async function POST(req: Request) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const email = (body.email || "").trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: true })
  }

  const underLimit = await checkAnonRateLimit("abandoned-signup-capture", getClientIp(req))
  if (!underLimit) {
    return NextResponse.json({ ok: true })
  }

  try {
    const db = adminDb()

    // ignoreDuplicates so a repeat blur (or someone retyping the same
    // email) never resets captured_at and never un-does a prior
    // unsubscribe -- only the very first capture for an email starts the
    // clock.
    const { data, error } = await db
      .from("abandoned_signups")
      .upsert({ email }, { onConflict: "email", ignoreDuplicates: true })
      .select("id")

    if (!error && data && data.length > 0) {
      await track("abandoned_signup_captured")
    }
  } catch {
    // Best-effort only.
  }

  return NextResponse.json({ ok: true })
}
