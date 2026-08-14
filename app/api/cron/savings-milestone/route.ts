import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendPushToUser } from "@/lib/push"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Ordered so "highest threshold crossed since last notified" is a simple
// forward scan -- fires once per threshold, even if a big deposit jumps a
// goal from 10% straight past 25/50/75 in one update (notifies the highest
// one crossed, not each individually, and records that as the new floor).
const THRESHOLDS = [25, 50, 75, 90, 100]

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, key, { auth: { persistSession: false } })
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
    .eq("push_savings_milestone", true)

  if (prefsErr) {
    return NextResponse.json({ error: prefsErr.message }, { status: 500 })
  }
  const eligibleUserIds = new Set((prefs || []).map((p) => p.user_id))
  if (eligibleUserIds.size === 0) {
    return NextResponse.json({ ok: true, processed: 0, pushSent: 0, results: [] })
  }

  const { data: goals, error: goalsErr } = await db
    .from("financial_goals")
    .select("id, user_id, title, target_amount, current_amount, last_milestone_notified_pct, status")
    .in("user_id", Array.from(eligibleUserIds))
    .neq("status", "archived")

  if (goalsErr) {
    return NextResponse.json({ error: goalsErr.message }, { status: 500 })
  }

  let pushSent = 0
  const results: Array<{ goal_id: string; user_id: string; pct: number; pushed: boolean }> = []

  for (const goal of goals || []) {
    const target = Number(goal.target_amount) || 0
    const current = Number(goal.current_amount) || 0
    if (target <= 0) continue

    const pct = Math.min(100, Math.floor((current / target) * 100))
    const lastNotified = Number(goal.last_milestone_notified_pct) || 0

    // Highest threshold that's both been reached and not yet notified.
    const crossed = THRESHOLDS.filter((t) => pct >= t && t > lastNotified).pop()
    if (!crossed) continue

    const remaining = Math.max(0, target - current)
    const title =
      crossed === 100
        ? "Goal reached!"
        : crossed + "% of the way to your goal"
    const body =
      crossed === 100
        ? "\"" + (goal.title || "Your savings goal") + "\" is fully funded. Nice work."
        : "\"" + (goal.title || "Your savings goal") + "\" is " + crossed + "% funded -- $" + remaining.toFixed(2) + " to go."

    const result = await sendPushToUser(goal.user_id, { title, body })
    const pushed = result.sent > 0
    if (pushed) pushSent++

    // Record the crossing regardless of actual delivery (no token registered
    // yet shouldn't mean we re-notify every single cron run once a device
    // does register) -- same "best effort, don't retry forever" posture as
    // the rest of the notification system.
    await db.from("financial_goals").update({ last_milestone_notified_pct: crossed }).eq("id", goal.id)

    results.push({ goal_id: goal.id, user_id: goal.user_id, pct: crossed, pushed })
  }

  return NextResponse.json({
    ok: true,
    processed: (goals || []).length,
    pushSent,
    results,
  })
}
