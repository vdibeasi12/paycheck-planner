// lib/challenge-email.ts
import type { ChallengeDay } from "@/lib/challenge-days"
import { addressLine } from "@/lib/emailFooter"

function escapeHtml(s: any): string {
  return (s == null ? "" : String(s))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function cta(label: string, href: string): string {
  return (
    '<p style="margin-top:20px;"><a href="' +
    href +
    '" style="display:inline-block;background:#34d399;color:#000000;font-weight:600;' +
    'padding:10px 20px;border-radius:8px;text-decoration:none;">' +
    escapeHtml(label) +
    "</a></p>"
  )
}

export function challengeEmailSubject(cd: ChallengeDay): string {
  return "Day " + cd.day + "/30: " + cd.title
}

export function challengeEmailHtml(cd: ChallengeDay, appUrl: string, unsubUrl: string): string {
  const ctaHtml = cd.cta ? cta(cd.cta.label, appUrl + cd.cta.href) : ""
  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;background:#0b1220;' +
    'padding:28px;border-radius:12px;max-width:560px;">' +
    '<span style="display:inline-block;background:rgba(52,211,153,0.15);color:#34d399;' +
    'font-size:12px;font-weight:600;padding:2px 10px;border-radius:999px;">' +
    "Day " +
    cd.day +
    " of 30 -- " +
    escapeHtml(cd.phase) +
    "</span>" +
    '<h2 style="margin:12px 0 8px;color:#ffffff;">' +
    escapeHtml(cd.title) +
    "</h2>" +
    '<p style="color:#e5e7eb;"><strong style="color:#ffffff;">Today:</strong> ' +
    escapeHtml(cd.task) +
    "</p>" +
    '<p style="color:#9ca3af;"><strong style="color:#d1d5db;">Why it matters:</strong> ' +
    escapeHtml(cd.whyItMatters) +
    "</p>" +
    ctaHtml +
    '<p style="margin-top:24px;font-size:12px;color:#6b7280;border-top:1px solid #1f2937;padding-top:16px;">' +
    "You're on Day " +
    cd.day +
    " of the 30-Day Paycheck Planner Challenge. " +
    '<a style="color:#6b7280;" href="' +
    unsubUrl +
    '">Unsubscribe</a></p>' +
    addressLine() +
    "</div>"
  )
}
