import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { resend } from "@/lib/email"
import { SEQUENCE } from "@/lib/email-sequence"

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

  // Day-0 is sent synchronously at signup (app/api/lead-magnet/subscribe),
  // so anyone still at step 0 here just hasn't been processed yet for some
  // reason (send failure, etc.) -- include them too, the loop below will
  // catch them up to whatever step is actually due.
  const { data: subs, error } = await db
    .from("lead_magnet_subscribers")
    .select("email, subscribed_at, unsubscribe_token, last_sequence_step")
    .is("unsubscribed_at", null)
    .lt("last_sequence_step", SEQUENCE.length)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  const results: Array<{ email: string; sentStep: number }> = []

  for (const sub of subs || []) {
    const elapsed = daysSince(sub.subscribed_at)
    const nextStep = SEQUENCE[sub.last_sequence_step]
    if (!nextStep) continue
    if (elapsed < nextStep.dayOffset) continue

    const unsubUrl =
      APP_URL + "/api/lead-magnet/unsubscribe?token=" + encodeURIComponent(sub.unsubscribe_token)

    const result = await resend.emails.send({
      from,
      to: sub.email,
      subject: nextStep.subject,
      html: nextStep.bodyHtml(unsubUrl),
    })

    if (!(result && (result as any).error)) {
      await db
        .from("lead_magnet_subscribers")
        .update({
          last_sequence_step: nextStep.step + 1,
          last_sequence_sent_at: new Date().toISOString(),
        })
        .eq("unsubscribe_token", sub.unsubscribe_token)
      sent++
      results.push({ email: sub.email, sentStep: nextStep.step })
    }
  }

  return NextResponse.json({ ok: true, checked: (subs || []).length, sent, results })
}
