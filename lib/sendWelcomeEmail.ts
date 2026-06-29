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

  const feature = (accent: string, title: string, body: string): string => `
            <td valign="top" width="50%" style="padding:8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:#0f172a;border:1px solid #1e293b;border-radius:12px;">
                <tr><td style="padding:18px;">
                  <div style="width:38px;height:6px;border-radius:3px;background:${accent};margin-bottom:12px;font-size:1px;line-height:1px;">&nbsp;</div>
                  <div style="font-size:15px;font-weight:bold;color:#f8fafc;margin-bottom:6px;">${title}</div>
                  <div style="font-size:13px;line-height:1.55;color:#94a3b8;">${body}</div>
                </td></tr>
              </table>
            </td>`

  return `
  <div style="margin:0;padding:0;background:#eef2f7;">
    <div style="max-width:600px;margin:0 auto;padding:24px 14px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
        <tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-bottom:none;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
          <img src="${logo}" alt="Paycheck Planner" width="190" style="display:inline-block;max-width:190px;height:auto;" />
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
        <tr><td style="background:#0b1220;padding:38px 28px;text-align:center;">
          <div style="display:inline-block;background:#0e3b2e;color:#34d399;font-size:12px;font-weight:bold;letter-spacing:1px;padding:6px 14px;border-radius:999px;margin-bottom:16px;">YOU'RE IN</div>
          <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:#ffffff;font-weight:800;">Welcome to a smarter financial future, ${safeName}!</h1>
          <p style="margin:0 auto 26px;max-width:430px;font-size:15px;line-height:1.6;color:#cbd5e1;">You just took the first step toward planning every paycheck, crushing debt faster, and finally seeing your debt-free date. Let's get you set up in about two minutes.</p>
          <a href="${appUrl}/dashboard" style="display:inline-block;background:#10b981;color:#04210f;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 30px;border-radius:10px;">Complete your setup -&gt;</a>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:#0b1220;">
        <tr>
          ${feature("#10b981", "Plan every paycheck", "Know exactly where every dollar should go before payday arrives.")}
          ${feature("#3b82f6", "Eliminate debt faster", "Snowball or avalanche - we map the fastest route to debt-free.")}
        </tr>
        <tr>
          ${feature("#a855f7", "AI-powered insights", "Personalized guidance based on your real balances and goals.")}
          ${feature("#f59e0b", "Your data stays secure", "Bank-level encryption. We never sell your personal information.")}
        </tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
        <tr><td style="background:#0b1220;padding:10px 28px 34px;text-align:center;">
          <p style="margin:16px 0 4px;font-size:14px;line-height:1.6;color:#e2e8f0;">Every great financial journey begins with one paycheck. We're excited to be part of yours.</p>
          <p style="margin:0;font-size:14px;font-weight:bold;color:#34d399;">- The Paycheck Planner Team</p>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
        <tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:22px 28px;text-align:center;">
          <p style="margin:0 0 10px;font-size:13px;color:#475569;">
            <strong>Need help?</strong>&nbsp;
            <a href="${appUrl}/support" style="color:#0f766e;text-decoration:none;">Support Center</a>
            &nbsp;|&nbsp;
            <a href="${appUrl}/contact" style="color:#0f766e;text-decoration:none;">Contact Us</a>
          </p>
          <p style="margin:0 0 10px;font-size:11px;color:#94a3b8;">
            <a href="${appUrl}/privacy" style="color:#94a3b8;text-decoration:none;">Privacy Policy</a>
            &nbsp;|&nbsp;
            <a href="${appUrl}/terms" style="color:#94a3b8;text-decoration:none;">Terms of Service</a>
            &nbsp;|&nbsp;
            <a href="${appUrl}/disclaimer" style="color:#94a3b8;text-decoration:none;">Disclaimer</a>
          </p>
          <p style="margin:0;font-size:11px;line-height:1.5;color:#a0aec0;">
            Independent financial management platform. No financial, legal, or investment advice.<br/>
            (c) 2026 Paycheck Planner - DiBeasi Global Investments LLC (DBA Paycheck Planner).<br/>
            You're receiving this because you created an account at paycheckplanner.ai.
          </p>
        </td></tr>
      </table>

    </div>
  </div>`
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
      subject: "Welcome to Paycheck Planner - let's plan your first paycheck!",
      html: welcomeHtml(name),
    })
    if (r && (r as any).error) throw new Error((r as any).error.message || "send error")
  } catch (e) {
    await db.from("profiles").update({ welcome_email_sent: false }).eq("id", userId)
    console.error("welcome email send failed:", e)
  }
}