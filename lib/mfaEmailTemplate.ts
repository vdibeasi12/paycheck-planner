// lib/mfaEmailTemplate.ts
// Server-only. Sends the branded "here's your sign-in code" email for users
// who chose email delivery for two-factor authentication.

import { resend } from "@/lib/email"

function codeHtml(code: string): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://paycheckplanner.ai"
  const logo = appUrl + "/logo.png"
  const spaced = code.split("").join(" ")

  return `
  <div style="margin:0;padding:0;background:#eef2f7;">
    <div style="max-width:480px;margin:0 auto;padding:24px 14px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
        <tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-bottom:none;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
          <img src="${logo}" alt="Paycheck Planner" width="170" style="display:inline-block;max-width:170px;height:auto;" />
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
        <tr><td style="background:#0b1220;padding:36px 28px;text-align:center;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
          <div style="display:inline-block;background:#0e3b2e;color:#34d399;font-size:12px;font-weight:bold;letter-spacing:1px;padding:6px 14px;border-radius:999px;margin-bottom:18px;">SIGN-IN CODE</div>
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#ffffff;font-weight:800;">Your verification code</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#94a3b8;">Enter this code to finish signing in to Paycheck Planner. It refreshes every 30 seconds, so enter it as soon as you can.</p>
          <div style="display:inline-block;background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:18px 28px;font-size:32px;font-weight:800;letter-spacing:6px;color:#34d399;font-family:'Courier New',monospace;">${spaced}</div>
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#64748b;">If you didn't try to sign in, you can safely ignore this email -- no one can access your account without this code.</p>
        </td></tr>
      </table>

    </div>
  </div>`
}

export async function sendMfaCodeEmail(
  to: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const from = process.env.EMAIL_FROM
  if (!from) {
    console.warn("EMAIL_FROM not set - skipping MFA code email")
    return { ok: false, error: "Email not configured" }
  }

  try {
    const r = await resend.emails.send({
      from,
      to,
      subject: `Your Paycheck Planner sign-in code`,
      html: codeHtml(code),
    })
    if (r && (r as any).error) {
      throw new Error((r as any).error.message || "send error")
    }
    return { ok: true }
  } catch (e: any) {
    console.error("mfa code email send failed:", e)
    return { ok: false, error: e?.message || "Could not send email" }
  }
}