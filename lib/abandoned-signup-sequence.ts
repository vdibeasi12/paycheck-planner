// lib/abandoned-signup-sequence.ts
// Abandoned-signup recovery drip (Task #22): 3 emails at 1hr / 24hr / 3-day
// after someone types their email into the signup form but never completes
// supabase.auth.signUp(). hoursOffset is hours since
// abandoned_signups.captured_at. The cron
// (app/api/cron/abandoned-signup-recovery/route.ts) sends whichever is the
// next un-sent step once its hoursOffset has arrived, then stops -- there
// is no step after the 3-day email. Progress is tracked via
// last_sequence_step, same shape as lib/email-sequence.ts and
// lib/onboarding-sequence.ts.
//
// Timing note: this project's vercel.json crons currently all run
// once/day. Vercel's Hobby plan caps cron frequency at once/day (Pro allows
// per-minute) -- see https://vercel.com/docs/cron-jobs/usage-and-pricing.
// Until this project is confirmed on Pro, the "1hr" email will actually go
// out whenever the once-daily abandoned-signup-recovery cron next runs and
// finds someone past the 1-hour mark, not exactly 60 minutes after they
// typed their email. If/when this project is on Pro, changing that cron's
// schedule in vercel.json to "0 * * * *" (hourly) will make the 1hr step
// fire close to on time; the 24hr/3-day steps work fine either way since
// they only need day-level precision.

import { addressLine } from "@/lib/emailFooter"

export type AbandonedSignupStep = {
  step: number
  hoursOffset: number
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
    "You're receiving this because you started creating a Paycheck Planner account. " +
    '<a style="color:#6b7280;" href="' +
    unsubUrl +
    '">Unsubscribe from these reminders</a></p>' +
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

export const SEQUENCE: AbandonedSignupStep[] = [
  {
    step: 0,
    hoursOffset: 1,
    subject: "Still there? Your paycheck plan is one step away",
    preview: "You started signing up a little while ago -- want to pick back up?",
    bodyHtml: (unsubUrl) =>
      wrap(
        '<h2 style="color:#ffffff;margin-top:0;">Pick up where you left off</h2>' +
          '<p style="color:#9ca3af;">You started creating a Paycheck Planner account a little while ago but ' +
          "didn't finish. No worries -- it only takes about a minute to get set up, and from there Paycheck " +
          "Planner lines your bills up against your real paycheck dates automatically.</p>" +
          cta("Finish creating your account", APP_URL + "/signup"),
        unsubUrl
      ),
  },
  {
    step: 1,
    hoursOffset: 24,
    subject: "What you're missing without a paycheck plan",
    preview: "Bill matching, a debt-free date, and savings that happen automatically.",
    bodyHtml: (unsubUrl) =>
      wrap(
        '<h2 style="color:#ffffff;margin-top:0;">Here\'s what a finished setup gets you</h2>' +
          '<p style="color:#9ca3af;">Once your account is set up, Paycheck Planner shows you exactly which ' +
          "paycheck covers which bill, maps out a real debt-free date, and can move savings automatically " +
          "before you ever see the money. It's free to start, and setup is quick.</p>" +
          cta("Create your free account", APP_URL + "/signup"),
        unsubUrl
      ),
  },
  {
    step: 2,
    hoursOffset: 72,
    subject: "Last reminder -- finish your paycheck plan",
    preview: "This is the last email about your unfinished signup.",
    bodyHtml: (unsubUrl) =>
      wrap(
        '<h2 style="color:#ffffff;margin-top:0;">One last nudge</h2>' +
          '<p style="color:#9ca3af;">This is the last reminder you\'ll get about the account you started a few ' +
          "days ago. If now's not the right time, no problem -- you won't hear from us about it again. If you'd " +
          "still like to get your paycheck, bills, and debt lined up automatically, it's still just a minute " +
          "away.</p>" +
          cta("Finish creating your account", APP_URL + "/signup"),
        unsubUrl
      ),
  },
]
