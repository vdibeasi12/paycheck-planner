import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { resend } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Canonical app origin for links in outbound emails. Tracks the production
// domain via env, with a safe fallback to the live custom domain.
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://paycheckplanner.ai"

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

function escapeHtml(s: any): string {
  return (s == null ? "" : String(s))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
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

  const { data: prefs, error: prefsErr } = await db
    .from("notification_preferences")
    .select("user_id, email_bill_reminders, reminder_days_before")
    .eq("email_bill_reminders", true)

  if (prefsErr) {
    return NextResponse.json({ error: prefsErr.message }, { status: 500 })
  }

  let sent = 0
  const results: Array<{ user_id: string; bills: number; emailed: boolean }> = []

  for (const pref of prefs || []) {
    const daysBefore =
      typeof pref.reminder_days_before === "number" ? pref.reminder_days_before : 3
    const { day: targetDay, daysInMonth } = reminderTarget(daysBefore)

    const { data: bills } = await db
      .from("bills")
      .select("name, amount, due_date, status")
      .eq("user_id", pref.user_id)

    // Match on the bill's effective due day for the target month. A bill stored
    // as due on the 31st (or 30th/29th) is clamped to the last day of shorter
    // months, so end-of-month bills still fire instead of being silently skipped.
    const due = (bills || []).filter((b: any) => {
      const s = (b.status || "").toString().toLowerCase()
      if (s === "paid") return false
      const dd = Number(b.due_date)
      if (!Number.isFinite(dd)) return false
      const effective = Math.min(dd, daysInMonth)
      return effective === targetDay
    })

    if (due.length === 0) {
      results.push({ user_id: pref.user_id, bills: 0, emailed: false })
      continue
    }

    const { data: profile } = await db
      .from("profiles")
      .select("email, full_name")
      .eq("id", pref.user_id)
      .single()

    const to = profile && profile.email ? String(profile.email) : ""
    if (!to) {
      results.push({ user_id: pref.user_id, bills: due.length, emailed: false })
      continue
    }

    const name = profile && profile.full_name ? String(profile.full_name) : "there"

    const rows = due
      .map((b: any) => {
        const amt = Number(b.amount || 0).toFixed(2)
        return (
          '<tr><td style="padding:6px 12px;border-bottom:1px solid #1f2937;">' +
          escapeHtml(b.name) +
          '</td><td style="padding:6px 12px;border-bottom:1px solid #1f2937;text-align:right;">$' +
          amt +
          "</td></tr>"
        )
      })
      .join("")

    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;background:#0b1220;padding:24px;border-radius:12px;">' +
      '<h2 style="margin:0 0 8px;color:#34d399;">Upcoming bills</h2>' +
      "<p>Hi " +
      escapeHtml(name) +
      ", these bills are due in about " +
      daysBefore +
      " day(s):</p>" +
      '<table style="border-collapse:collapse;width:100%;max-width:420px;"><tbody>' +
      rows +
      "</tbody></table>" +
      '<p style="margin-top:20px;"><a style="color:#34d399;" href="' + APP_URL + '/bills">Review your bills</a></p>' +
      "</div>"

    const r = await resend.emails.send({
      from,
      to,
      subject: "Bills due in " + daysBefore + " day(s)",
      html,
    })

    const ok = !(r && (r as any).error)
    if (ok) sent++
    results.push({ user_id: pref.user_id, bills: due.length, emailed: ok })
  }

  return NextResponse.json({
    ok: true,
    processed: (prefs || []).length,
    sent,
    results,
  })
}