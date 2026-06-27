// lib/sendWelcomeEmail.ts
// One-time, race-safe welcome email for new signups. Uses a service-role
// client so the atomic "claim" update is not blocked by row-level security,
// and rolls the flag back if the send fails so a later visit can retry.

import { createClient } from "@supabase/supabase-js"
import { resend } from "@/lib/email"

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } }
  )
}

function escapeHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function welcomeHtml(name: string): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://paycheckplanner.ai"
  const logo = appUrl + "/logo.png"
  const safeName = escapeHtml(name) || "there"

  return (
    '<div style="margin:0;padding:0;background:#f1f5f9;">' +
    '<div style="max-width:560px;margin:0 auto;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">' +
    '<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">' +
    '<div style="background:#0b1220;padding:28px 32px;text-align:center;">' +
    '<img src="' + logo + '" alt="Paycheck Planner" width="180" style="display:inline-block;max-width:180px;height:auto;" />' +
    "</div>" +
    '<div style="padding:32px;">' +
    '<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0f172a;">Welcome, ' +
    safeName +
    "!</h1>" +
    '<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">' +
    "Your account is ready. Paycheck Planner helps you plan every paycheck, track your debts, " +
    "and see exactly when you'll be debt-free." +
    "</p>" +
    '<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">' +
    "Here's a great way to start:" +
    "</p>" +
    '<table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 28px;">' +
    "<tbody>" +
    welcomeStep("1", "Add your income", "Enter each paycheck so the budget math is right.") +
    welcomeStep("2", "Add your debts", "Balances, APRs, and minimums power your payoff plan.") +
    welcomeStep("3", "See your payoff date", "Watch your debt-free date come into focus.") +
    "</tbody></table>" +
    '<div style="text-align:center;margin:0 0 8px;">' +
    '<a href="' + appUrl + '/dashboard" ' +
    'style="display:inline-block;background:#10b981;color:#04210f;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:10px;">' +
    "Open your dashboard</a>" +
    "</div>" +
    "</div>" +
    '<div style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">' +
    '<p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">' +
    "Paycheck Planner, a service of DiBeasi Global Investments LLC. " +
    "You're receiving this because you created an account at paycheckplanner.ai." +
    "</p>" +
    "</div>" +
    "</div>" +
    "</div>" +
    "</div>"
  )
}

function welcomeStep(n: string, title: string, desc: string): string {
  return (
    "<tr>" +
    '<td valign="top" style="width:34px;padding:6px 0;">' +
    '<div style="width:26px;height:26px;border-radius:13px;background:#10b981;color:#04210f;font-weight:bold;font-size:14px;text-align:center;line-height:26px;">' +
    n +
    "</div></td>" +
    '<td style="padding:6px 0 6px 12px;">' +
    '<div style="font-size:15px;font-weight:bold;color:#0f172a;">' + title + "</div>" +
    '<div style="font-size:13px;line-height:1.5;color:#64748b;">' + desc + "</div>" +
    "</td></tr>"
  )
}

export async function maybeSendWelcomeEmail(userId: string): Promise<void> {
  const from = process.env.EMAIL_FROM
  if (!from) {
    console.warn("EMAIL_FROM not set - skipping welcome email")
    return
  }

  const db = adminDb()

  const { data: claimed, error } = await db
    .from("profiles")
    .update({ welcome_email_sent: true })
    .eq("id", userId)
    .eq("welcome_email_sent", false)
    .select("email, full_name")

  if (error || !claimed || claimed.length === 0) return

  const to = claimed[0].email
  if (!to) return
  const name = (claimed[0].full_name as string) || ""

  try {
    const r = await resend.emails.send({
      from,
      to,
      subject: "Welcome to Paycheck Planner",
      html: welcomeHtml(name),
    })
    if (r && (r as any).error) throw new Error((r as any).error.message || "send error")
  } catch (e) {
    await db.from("profiles").update({ welcome_email_sent: false }).eq("id", userId)
    console.error("welcome email send failed:", e)
  }
}