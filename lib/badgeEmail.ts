// lib/badgeEmail.ts
// Badge-earned email template -- same visual system as
// lib/sendWelcomeEmail.ts's welcomeHtml (dark #0b1220 hero card, white
// rounded outer caps, emerald pill eyebrow, emerald CTA button, inline
// styles/table layout for email-client compatibility) so a badge email
// doesn't look like it came from a different, less-finished product.

import { addressLine } from "@/lib/emailFooter"
import type { Badge } from "@/lib/achievements"

function escapeHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function badgeEarnedSubject(badge: Badge): string {
  return `Badge unlocked: ${badge.title}`
}

export function badgeEarnedHtml(name: string, badge: Badge): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://paycheckplanner.ai"
  const logo = appUrl + "/logo.png"
  const safeName = escapeHtml(name) || "there"
  const accent = badge.accent

  return `
  <div style="margin:0;padding:0;background:#eef2f7;">
    <div style="max-width:600px;margin:0 auto;padding:24px 14px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
        <tr><td style="background:#ffffff;border:1px solid #e2e8f0;border-bottom:none;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
          <img src="${logo}" alt="Paycheck Planner" width="190" style="display:inline-block;max-width:190px;height:auto;" />
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:#0b1220;">
        <tr><td style="padding:38px 28px;text-align:center;">
          <div style="display:inline-block;background:#0e3b2e;color:#34d399;font-size:12px;font-weight:bold;letter-spacing:1px;padding:6px 14px;border-radius:999px;margin-bottom:20px;">BADGE UNLOCKED</div>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
            <tr><td style="width:72px;height:72px;border-radius:999px;background:${accent}22;border:2px solid ${accent};text-align:center;vertical-align:middle;font-size:30px;line-height:72px;">
              🏆
            </td></tr>
          </table>

          <h1 style="margin:0 0 8px;font-size:24px;line-height:1.3;color:#ffffff;font-weight:800;">${escapeHtml(badge.title)}</h1>
          <p style="margin:0 auto 22px;max-width:420px;font-size:14px;line-height:1.6;color:#94a3b8;">Nice work, ${safeName} -- ${escapeHtml(badge.description.toLowerCase())}</p>
          <a href="${appUrl}/achievements" style="display:inline-block;background:#10b981;color:#04210f;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 28px;border-radius:10px;">See all your badges -&gt;</a>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
        <tr><td style="background:#0b1220;padding:0 28px 34px;text-align:center;">
          <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">Keep going -- there's more to unlock on your Achievements page.</p>
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
          <p style="margin:0;font-size:11px;line-height:1.5;color:#a0aec0;">
            Independent financial management platform. No financial, legal, or investment advice.<br/>
            (c) 2026 Paycheck Planner - DiBeasi Global Investments LLC (DBA Paycheck Planner).<br/>
            You're receiving this because you earned a badge at paycheckplanner.ai.
          </p>
          ${addressLine()}
        </td></tr>
      </table>

    </div>
  </div>`
}
