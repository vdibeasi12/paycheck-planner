import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { resend } from "@/lib/email"
import { CHALLENGE_DAYS, getChallengeDay } from "@/lib/challenge-days"
import { challengeEmailSubject, challengeEmailHtml } from "@/lib/challenge-email"

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

  const { data: subs, error } = await db
    .from("challenge_subscribers")
    .select("email, subscribed_at, unsubscribe_token, last_day_sent")
    .is("unsubscribed_at", null)
    .lt("last_day_sent", CHALLENGE_DAYS.length)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  const results: Array<{ email: string; sentDay: number }> = []

  for (const sub of subs || []) {
    const elapsed = daysSince(sub.subscribed_at)
    const nextDayNum = sub.last_day_sent + 1
    const nextDay = getChallengeDay(nextDayNum)
    if (!nextDay) continue
    // Day N is due N-1 days after subscribing (Day 1 fires at signup, day 0).
    if (elapsed < nextDay.day - 1) continue

    const unsubUrl =
      APP_URL + "/api/challenge/unsubscribe?token=" + encodeURIComponent(sub.unsubscribe_token)

    const result = await resend.emails.send({
      from,
      to: sub.email,
      subject: challengeEmailSubject(nextDay),
      html: challengeEmailHtml(nextDay, APP_URL, unsubUrl),
    })

    if (!(result && (result as any).error)) {
      await db
        .from("challenge_subscribers")
        .update({ last_day_sent: nextDay.day })
        .eq("unsubscribe_token", sub.unsubscribe_token)
      sent++
      results.push({ email: sub.email, sentDay: nextDay.day })
    }
  }

  return NextResponse.json({ ok: true, checked: (subs || []).length, sent, results })
}
