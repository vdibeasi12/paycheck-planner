import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { resend } from "@/lib/email"
import { SEQUENCE } from "@/lib/abandoned-signup-sequence"

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

function hoursSince(iso: string): number {
  const then = new Date(iso).getTime()
  const now = Date.now()
  return (now - then) / (60 * 60 * 1000)
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization") || ""
  if (!secret || auth !== "Bearer " + secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = adminDb()

  const { data: rows, error } = await db
    .from("abandoned_signups")
    .select("id, email, captured_at, unsubscribe_token, last_sequence_step")
    .is("unsubscribed_at", null)
    .is("converted_at", null)
    .lt("last_sequence_step", SEQUENCE.length)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const candidates = rows || []
  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, converted: 0, sent: 0, results: [] })
  }

  // Anyone who actually finished signing up in the meantime has a matching
  // profiles row -- profiles is populated immediately at signUp() time by
  // the on_auth_user_created trigger, before email confirmation, so this
  // check is a reliable stop signal that doesn't depend on any client-side
  // "I signed up" call succeeding.
  const emails = candidates.map((r) => r.email)
  const { data: signedUp } = await db.from("profiles").select("email").in("email", emails)
  const signedUpSet = new Set((signedUp || []).map((p) => (p.email || "").toLowerCase()))

  const converted = candidates.filter((r) => signedUpSet.has(r.email.toLowerCase()))
  if (converted.length > 0) {
    await db
      .from("abandoned_signups")
      .update({ converted_at: new Date().toISOString() })
      .in(
        "id",
        converted.map((r) => r.id)
      )
  }

  const pending = candidates.filter((r) => !signedUpSet.has(r.email.toLowerCase()))

  const from = process.env.EMAIL_FROM
  let sent = 0
  const results: Array<{ email: string; sentStep: number }> = []

  if (from) {
    for (const row of pending) {
      const elapsedHours = hoursSince(row.captured_at)
      const nextStep = SEQUENCE[row.last_sequence_step]
      if (!nextStep) continue
      if (elapsedHours < nextStep.hoursOffset) continue

      const unsubUrl =
        APP_URL + "/api/abandoned-signup/unsubscribe?token=" + encodeURIComponent(row.unsubscribe_token)

      const result = await resend.emails.send({
        from,
        to: row.email,
        subject: nextStep.subject,
        html: nextStep.bodyHtml(unsubUrl),
      })

      if (!(result && (result as any).error)) {
        await db
          .from("abandoned_signups")
          .update({
            last_sequence_step: nextStep.step + 1,
            last_sequence_sent_at: new Date().toISOString(),
          })
          .eq("id", row.id)
        sent++
        results.push({ email: row.email, sentStep: nextStep.step })
      }
    }
  }

  return NextResponse.json({
    ok: true,
    checked: candidates.length,
    converted: converted.length,
    sent,
    results,
  })
}
