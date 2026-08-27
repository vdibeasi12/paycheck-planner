// lib/onboarding-sequence.ts
// Post-signup onboarding drip: 5 emails on Day 1/3/5/7/14 after account
// creation. Day 0 is handled separately -- lib/sendWelcomeEmail.ts sends
// the welcome email synchronously right at signup, so this sequence picks
// up the next day. dayOffset is days since profiles.created_at. The cron
// (app/api/cron/onboarding-drip/route.ts) sends whichever is the next
// un-sent step once its dayOffset has arrived, using
// onboarding_sequence_step on profiles to track progress per user.

import { addressLine } from "@/lib/emailFooter"

export type OnboardingStep = {
  step: number
  dayOffset: number
  subject: string
  preview: string
  bodyHtml: (unsubUrl: string) => string
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://paycheckplanner.ai"

function wrap(inner: string, unsubUrl: string): string {
  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;background:#0b1220;' +
    'padding:28px;border-radius:12px;max-width:560px;">' +
    inner +
    '<p style="margin-top:28px;font-size:12px;color:#6b7280;border-top:1px solid #1f2937;padding-top:16px;">' +
    "You're receiving this because you created a Paycheck Planner account. " +
    '<a style="color:#6b7280;" href="' +
    unsubUrl +
    '">Unsubscribe from setup tips</a></p>' +
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

export const SEQUENCE: OnboardingStep[] = [
  {
    step: 0,
    dayOffset: 1,
    subject: "Add your first paycheck (takes about 90 seconds)",
    preview: "Everything else in Paycheck Planner starts from this one step.",
    bodyHtml: (unsubUrl) =>
      wrap(
        '<h2 style="color:#ffffff;margin-top:0;">Start with your paycheck</h2>' +
          '<p style="color:#9ca3af;">Every feature -- bill matching, your debt-free date, savings automation -- ' +
          "starts from your paycheck schedule. If you haven't added yours yet, it's the one thing worth doing " +
          "before anything else.</p>" +
          "<p style=\"color:#9ca3af;\">Tell us how often you're paid and your next pay date, and we'll line " +
          "everything else up around it automatically.</p>" +
          cta("Add your paycheck", APP_URL + "/income"),
        unsubUrl
      ),
  },
  {
    step: 1,
    dayOffset: 3,
    subject: "Line your bills up against payday",
    preview: "See exactly which paycheck covers which bill -- before it's due.",
    bodyHtml: (unsubUrl) =>
      wrap(
        '<h2 style="color:#ffffff;margin-top:0;">Know what each paycheck owes</h2>' +
          '<p style="color:#9ca3af;">Add your recurring bills and Paycheck Planner matches each one to the ' +
          "paycheck that covers it. No more guessing whether Friday's paycheck is actually free to spend, or " +
          "already spoken for.</p>" +
          cta("Add your bills", APP_URL + "/bills"),
        unsubUrl
      ),
  },
  {
    step: 2,
    dayOffset: 5,
    subject: "See your debt-free date",
    preview: "Snowball or avalanche -- either way, put a real date on it.",
    bodyHtml: (unsubUrl) =>
      wrap(
        '<h2 style="color:#ffffff;margin-top:0;">Put a date on debt-free</h2>' +
          '<p style="color:#9ca3af;">Add your debts and Paycheck Planner maps out a snowball or avalanche ' +
          "payoff plan against your real paycheck schedule -- so you know not just how much you owe, but " +
          "exactly when it ends.</p>" +
          cta("Set up your payoff plan", APP_URL + "/debts"),
        unsubUrl
      ),
  },
  {
    step: 3,
    dayOffset: 7,
    subject: "The Money Quiz -- one minute, no spreadsheets",
    preview: "A quick snapshot of where your finances actually stand.",
    bodyHtml: (unsubUrl) =>
      wrap(
        '<h2 style="color:#ffffff;margin-top:0;">Where do you actually stand?</h2>' +
          '<p style="color:#9ca3af;">A week in, this is a good moment to take the Money Quiz -- a quick, ' +
          "free snapshot across savings, debt, and spending that shows you exactly where to focus next.</p>" +
          cta("Take the Money Quiz", APP_URL + "/money-score"),
        unsubUrl
      ),
  },
  {
    step: 4,
    dayOffset: 14,
    subject: "Put your money on autopilot",
    preview: "Credit card sync, AI insights, and one less thing to think about.",
    bodyHtml: (unsubUrl) =>
      wrap(
        '<h2 style="color:#ffffff;margin-top:0;">Two weeks in</h2>' +
          '<p style="color:#9ca3af;">By now your paycheck, bills, and debt plan should all be set up. The ' +
          "next step is making it automatic: connect your credit card so balances and due dates update themselves, " +
          "and get AI-powered guidance based on your real numbers instead of general advice.</p>" +
          cta("See Paycheck Planner plans", APP_URL + "/pricing") +
          '<p style="color:#9ca3af;margin-top:24px;">Know someone else who\'d want this? Your referral link is ' +
          "in your account settings -- share it and you both get rewarded.</p>" +
          cta("Get your referral link", APP_URL + "/account"),
        unsubUrl
      ),
  },
]
