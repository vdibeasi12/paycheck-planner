// lib/money-score-email.ts
// Builds the personalized improvement plan email sent right after someone
// unlocks their Money Quiz result with their email (app/api/money-score/unlock).
// Styling mirrors the existing branded email templates (lib/email-sequence.ts,
// lib/challenge-email.ts): dark card, emerald CTA, muted footer.

import {
  CATEGORY_LABELS,
  CATEGORY_TIPS,
  type MoneyScoreCategory,
  type MoneyScoreCategoryResult,
  type ScoreBand,
} from "./money-score"
import { addressLine } from "@/lib/emailFooter"

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://paycheckplanner.ai"

function wrap(inner: string): string {
  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;background:#0b1220;' +
    'padding:28px;border-radius:12px;max-width:560px;">' +
    inner +
    '<p style="margin-top:28px;font-size:12px;color:#6b7280;border-top:1px solid #1f2937;padding-top:16px;">' +
    "You're getting this because you requested your personalized improvement plan after taking " +
    "the Paycheck Planner Money Quiz." +
    "</p>" +
    addressLine() +
    "</div>"
  )
}

function cta(label: string, href: string): string {
  return (
    '<p style="margin-top:20px;"><a href="' +
    href +
    '" style="display:inline-block;background:#34d399;color:#000000;font-weight:600;' +
    'padding:10px 20px;border-radius:8px;text-decoration:none;">' +
    label +
    "</a></p>"
  )
}

export function buildMoneyScorePlanEmail(
  score: number,
  band: ScoreBand,
  categoryScores: Record<MoneyScoreCategory, MoneyScoreCategoryResult>,
  shareSlug: string
): { subject: string; html: string } {
  const entries = Object.entries(categoryScores) as [
    MoneyScoreCategory,
    MoneyScoreCategoryResult
  ][]
  const weakest = [...entries].sort((a, b) => a[1].percent - b[1].percent).slice(0, 3)
  const resultUrl = APP_URL + "/money-score/result/" + shareSlug

  const focusItems = weakest
    .map(([key, val]) => {
      return (
        '<div style="margin-top:14px;padding:14px 16px;border-radius:10px;background:#111827;border:1px solid #1f2937;">' +
        '<p style="margin:0 0 4px;font-weight:600;color:#ffffff;">' +
        CATEGORY_LABELS[key] +
        " -- " +
        val.percent +
        "%</p>" +
        '<p style="margin:0;color:#9ca3af;font-size:14px;">' +
        CATEGORY_TIPS[key] +
        "</p></div>"
      )
    })
    .join("")

  const subject = "Your " + score + "/100 Money Quiz score -- here's your improvement plan"

  const html = wrap(
    '<h2 style="color:#ffffff;margin-top:0;">Your Money Quiz score: ' + score + "/100</h2>" +
      '<p style="color:#9ca3af;">You scored in the &ldquo;' +
      band.label +
      '&rdquo; range. Here are the ' +
      weakest.length +
      " areas that will move your score the most:</p>" +
      focusItems +
      cta("Start Free with Paycheck Planner", APP_URL + "/signup") +
      '<p style="margin-top:16px;"><a href="' +
      resultUrl +
      '" style="color:#34d399;font-size:13px;">View your full results</a></p>'
  )

  return { subject, html }
}
