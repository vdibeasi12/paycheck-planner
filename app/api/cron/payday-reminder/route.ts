import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { resend } from "@/lib/email"
import { formatCurrency } from "@/lib/i18n/formatCurrency"
import { occurrencesInMonth, type Frequency } from "@/lib/schedule"

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

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
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
    .select("user_id, email_payday_reminder, payday_reminder_days_before")
    .eq("email_payday_reminder", true)

  if (prefsErr) {
    return NextResponse.json({ error: prefsErr.message }, { status: 500 })
  }

  let sent = 0
  const results: Array<{ user_id: string; paychecks: number; emailed: boolean }> = []

  for (const pref of prefs || []) {
    const daysBefore =
      typeof pref.payday_reminder_days_before === "number" ? pref.payday_reminder_days_before : 1

    // Project each income source's occurrences for the target day's own
    // month (not "this" month) -- same lib/schedule.ts helper the in-app
    // calendar uses against income.next_pay_date, so a reminder fires
    // whenever the projected schedule says a payday lands on that date,
    // not just off a single static next_pay_date value.
    const target = new Date()
    target.setDate(target.getDate() + daysBefore)
    const targetISO = toISODate(target)
    const targetYear = target.getFullYear()
    const targetMonth = target.getMonth()

    const { data: incomes } = await db
      .from("income")
      .select("name, amount, frequency, next_pay_date")
      .eq("user_id", pref.user_id)

    const upcoming = (incomes || []).filter((inc: any) => {
      if (!inc.next_pay_date || !inc.frequency) return false
      const dates = occurrencesInMonth(inc.next_pay_date, inc.frequency as Frequency, targetYear, targetMonth)
      return dates.includes(targetISO)
    })

    if (upcoming.length === 0) {
      results.push({ user_id: pref.user_id, paychecks: 0, emailed: false })
      continue
    }

    const { data: profile } = await db
      .from("profiles")
      .select("email, full_name, locale, display_currency")
      .eq("id", pref.user_id)
      .single()

    const to = profile && profile.email ? String(profile.email) : ""
    if (!to) {
      results.push({ user_id: pref.user_id, paychecks: upcoming.length, emailed: false })
      continue
    }

    const name = profile && profile.full_name ? String(profile.full_name) : "there"
    const userLocale = (profile && (profile as any).locale) || "en-US"
    const userCurrency = (profile && (profile as any).display_currency) || "USD"

    const rows = upcoming
      .map((inc: any) => {
        const amt = formatCurrency(Number(inc.amount || 0), userCurrency, userLocale)
        return (
          '<tr><td style="padding:6px 12px;border-bottom:1px solid #1f2937;">' +
          escapeHtml(inc.name || "Paycheck") +
          '</td><td style="padding:6px 12px;border-bottom:1px solid #1f2937;text-align:right;">' +
          amt +
          "</td></tr>"
        )
      })
      .join("")

    const dayWord = daysBefore === 1 ? "tomorrow" : "in " + daysBefore + " days"

    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;background:#0b1220;padding:24px;border-radius:12px;">' +
      '<h2 style="margin:0 0 8px;color:#34d399;">Payday is ' +
      dayWord +
      "</h2>" +
      "<p>Hi " +
      escapeHtml(name) +
      ", here's what's landing " +
      dayWord +
      ":</p>" +
      '<table style="border-collapse:collapse;width:100%;max-width:420px;"><tbody>' +
      rows +
      "</tbody></table>" +
      '<p style="margin-top:20px;"><a style="color:#34d399;" href="' +
      APP_URL +
      '/bills">Review what\'s due against this paycheck</a></p>' +
      "</div>"

    const r = await resend.emails.send({
      from,
      to,
      subject: "Payday is " + dayWord,
      html,
    })

    const ok = !(r && (r as any).error)
    if (ok) sent++
    results.push({ user_id: pref.user_id, paychecks: upcoming.length, emailed: ok })
  }

  return NextResponse.json({
    ok: true,
    processed: (prefs || []).length,
    sent,
    results,
  })
}
