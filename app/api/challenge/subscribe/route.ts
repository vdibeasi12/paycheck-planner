import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { resend } from "@/lib/email"
import { getChallengeDay } from "@/lib/challenge-days"
import { challengeEmailSubject, challengeEmailHtml } from "@/lib/challenge-email"
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

async function getSessionUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization")
  if (!auth || !auth.startsWith("Bearer ")) return null
  const token = auth.slice("Bearer ".length)
  const db = adminDb()
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

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

  const underLimit = await checkAnonRateLimit("challenge-subscribe", getClientIp(req))
  if (!underLimit) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
  }

  const from = process.env.EMAIL_FROM
  const userId = await getSessionUserId(req)
  const db = adminDb()

  const { data: row, error } = await db
    .from("challenge_subscribers")
    .upsert(
      { email, user_id: userId, unsubscribed_at: null },
      { onConflict: "email" }
    )
    .select("unsubscribe_token, last_day_sent")
    .single()

  if (error || !row) {
    return NextResponse.json({ error: "Could not save your request" }, { status: 500 })
  }

  // Day 1 fires immediately -- same reasoning as the worksheet's day-0
  // email. Only on first join; a re-submit just confirms the existing spot.
  if (from && row.last_day_sent === 0) {
    const day1 = getChallengeDay(1)
    if (day1) {
      const unsubUrl =
        APP_URL + "/api/challenge/unsubscribe?token=" + encodeURIComponent(row.unsubscribe_token)
      const result = await resend.emails.send({
        from,
        to: email,
        subject: challengeEmailSubject(day1),
        html: challengeEmailHtml(day1, APP_URL, unsubUrl),
      })
      if (!(result && (result as any).error)) {
        await db
          .from("challenge_subscribers")
          .update({ last_day_sent: 1 })
          .eq("unsubscribe_token", row.unsubscribe_token)
      }
    }
  }

  return NextResponse.json({ ok: true })
}

export async function GET(req: Request) {
  const userId = await getSessionUserId(req)
  if (!userId) return NextResponse.json({ subscribed: false })
  const db = adminDb()
  const { data } = await db
    .from("challenge_subscribers")
    .select("unsubscribed_at, last_day_sent")
    .eq("user_id", userId)
    .maybeSingle()
  return NextResponse.json({
    subscribed: !!data && !data.unsubscribed_at,
    day: data?.last_day_sent || 0,
  })
}
