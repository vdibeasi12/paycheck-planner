import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendPushToUser } from "@/lib/push"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Push-only reminder for an upcoming debt payment, fixed at 3 days before
// (no separate configurable days-before column -- mirrors the original
// bill-reminders default rather than adding a fourth "days before" setting
// to notification_preferences). Structurally identical to
// app/api/cron/bill-reminders/route.ts, one table swapped for another.
const DAYS_BEFORE = 3

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, key, { auth: { persistSession: false } })
}

function reminderTarget(daysAhead: number): { day: number; daysInMonth: number } {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  const day = d.getDate()
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return { day, daysInMonth }
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
    .eq("push_debt_reminder", true)

  if (prefsErr) {
    return NextResponse.json({ error: prefsErr.message }, { status: 500 })
  }

  const { day: targetDay, daysInMonth } = reminderTarget(DAYS_BEFORE)

  let pushSent = 0
  const results: Array<{ user_id: string; debts: number; pushed: boolean }> = []

  for (const pref of prefs || []) {
    const { data: debts } = await db
      .from("debts")
      .select("name, minimum_payment, due_date, status")
      .eq("user_id", pref.user_id)

    const due = (debts || []).filter((d: any) => {
      const s = (d.status || "").toString().toLowerCase()
      if (s === "paid" || s === "closed") return false
      const dd = Number(d.due_date)
      if (!Number.isFinite(dd)) return false
      const effective = Math.min(dd, daysInMonth)
      return effective === targetDay
    })

    if (due.length === 0) {
      results.push({ user_id: pref.user_id, debts: 0, pushed: false })
      continue
    }

    const debtNames = due.map((d: any) => d.name).filter(Boolean).slice(0, 3).join(", ")
    const result = await sendPushToUser(pref.user_id, {
      title: due.length === 1 ? "A debt payment is coming up" : due.length + " debt payments are coming up",
      body: debtNames + (due.length > 3 ? ", and more" : "") + " -- due in about " + DAYS_BEFORE + " day(s).",
    })
    const pushed = result.sent > 0
    if (pushed) pushSent++
    results.push({ user_id: pref.user_id, debts: due.length, pushed })
  }

  return NextResponse.json({
    ok: true,
    processed: (prefs || []).length,
    pushSent,
    results,
  })
}
