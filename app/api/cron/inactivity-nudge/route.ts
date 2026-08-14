import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendPushToUser } from "@/lib/push"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Fires once per account, on the day inactivity crosses exactly 14 days --
// an exact-day match (same pattern as the bill/debt/payday reminders'
// due-day matching), not "14 days or more", so a daily cron run doesn't
// re-notify someone every day for the rest of their inactivity.
const INACTIVE_DAYS = 14

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

  const db = adminDb()

  const { data: prefs, error: prefsErr } = await db
    .from("notification_preferences")
    .select("user_id")
    .eq("push_inactivity", true)

  if (prefsErr) {
    return NextResponse.json({ error: prefsErr.message }, { status: 500 })
  }
  const eligibleUserIds = (prefs || []).map((p) => p.user_id)
  if (eligibleUserIds.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, pushSent: 0, results: [] })
  }

  const { data: profiles, error: profilesErr } = await db
    .from("profiles")
    .select("id, last_active_at")
    .in("id", eligibleUserIds)
    .not("last_active_at", "is", null)

  if (profilesErr) {
    return NextResponse.json({ error: profilesErr.message }, { status: 500 })
  }

  let pushSent = 0
  const results: Array<{ user_id: string; pushed: boolean }> = []

  for (const p of profiles || []) {
    if (daysSince(p.last_active_at as string) !== INACTIVE_DAYS) continue

    const result = await sendPushToUser(p.id, {
      title: "Your money hasn't stopped moving",
      body: "Let's check your plan -- see what's changed since your last visit.",
    })
    const pushed = result.sent > 0
    if (pushed) pushSent++
    results.push({ user_id: p.id, pushed })
  }

  return NextResponse.json({
    ok: true,
    processed: (profiles || []).length,
    pushSent,
    results,
  })
}
