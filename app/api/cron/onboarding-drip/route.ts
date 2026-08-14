import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { resend } from "@/lib/email"
import { SEQUENCE } from "@/lib/onboarding-sequence"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://paycheckplanner.ai"

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, key, { auth: { persistSession: false } })
}

function daysSince(iso: string): number {
  const then = new Date(iso).getTime()
  const now = Date.now()
  return Math.floor((now - then) / (24 * 60 * 60 * 1000))
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization") || ""
  if (!secret || auth !== "Bearer " + secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const from = process.env.EMAIL_FROM
  if (!from) {
    return NextResponse.json({ error: "EMAIL_FROM not set" }, { status: 500 })
  }

  const db = adminDb()

  // Elapsed time is measured from account creation, not a separate
  // "subscribed_at" -- this drip runs for every signed-up user unless they
  // unsubscribe. Day 0 (the welcome email) is sent synchronously at signup
  // by lib/sendWelcomeEmail.ts, so SEQUENCE starts at Day 1.
  const { data: users, error } = await db
    .from("profiles")
    .select("id, email, full_name, created_at, onboarding_sequence_step, onboarding_unsub_token")
    .eq("onboarding_unsubscribed", false)
    .lt("onboarding_sequence_step", SEQUENCE.length)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  const results: Array<{ user_id: string; sentStep: number }> = []

  for (const user of users || []) {
    if (!user.email || !user.created_at) continue

    const elapsed = daysSince(user.created_at)
    const nextStep = SEQUENCE[user.onboarding_sequence_step]
    if (!nextStep) continue
    if (elapsed < nextStep.dayOffset) continue

    const unsubUrl =
      APP_URL + "/api/onboarding/unsubscribe?token=" + encodeURIComponent(user.onboarding_unsub_token)

    const result = await resend.emails.send({
      from,
      to: user.email,
      subject: nextStep.subject,
      html: nextStep.bodyHtml(unsubUrl),
    })

    if (!(result && (result as any).error)) {
      await db
        .from("profiles")
        .update({
          onboarding_sequence_step: nextStep.step + 1,
          onboarding_sequence_sent_at: new Date().toISOString(),
        })
        .eq("id", user.id)
      sent++
      results.push({ user_id: user.id, sentStep: nextStep.step })
    }
  }

  return NextResponse.json({ ok: true, checked: (users || []).length, sent, results })
}
