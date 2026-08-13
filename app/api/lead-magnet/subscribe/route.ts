import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { resend } from "@/lib/email"
import { SEQUENCE } from "@/lib/email-sequence"
import { checkAnonRateLimit, getClientIp } from "@/lib/anonRateLimit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, key, { auth: { persistSession: false } })
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://paycheckplanner.ai"

export async function POST(req: Request) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const email = (body.email || "").trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 })
  }

  const underLimit = await checkAnonRateLimit("lead-magnet-subscribe", getClientIp(req))
  if (!underLimit) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
  }

  const from = process.env.EMAIL_FROM
  const db = adminDb()

  const { data: row, error } = await db
    .from("lead_magnet_subscribers")
    .upsert(
      { email, unsubscribed_at: null },
      { onConflict: "email" }
    )
    .select("unsubscribe_token, last_sequence_step")
    .single()

  if (error || !row) {
    return NextResponse.json({ error: "Could not save your request" }, { status: 500 })
  }

  // Send the day-0 worksheet email right away rather than waiting for
  // tomorrow's cron -- this is the one step people expect instantly.
  // Only fires the first time (a re-submit from an already-subscribed
  // email just confirms, doesn't re-trigger the whole sequence).
  if (from && row.last_sequence_step === 0) {
    const step = SEQUENCE[0]
    const unsubUrl = APP_URL + "/api/lead-magnet/unsubscribe?token=" + encodeURIComponent(row.unsubscribe_token)
    const result = await resend.emails.send({
      from,
      to: email,
      subject: step.subject,
      html: step.bodyHtml(unsubUrl),
    })
    if (!(result && (result as any).error)) {
      await db
        .from("lead_magnet_subscribers")
        .update({ last_sequence_step: 1, last_sequence_sent_at: new Date().toISOString() })
        .eq("unsubscribe_token", row.unsubscribe_token)
    }
  }

  return NextResponse.json({ ok: true })
}
