// lib/email-sequence.ts
// The "Free Paycheck Budget Worksheet" lead magnet drip: 6 emails over 14
// days. dayOffset is days since subscribing (0 = send immediately). The
// cron (app/api/cron/lead-magnet-drip/route.ts) sends whichever is the
// next un-sent step once its dayOffset has arrived, using
// last_sequence_step to track progress per subscriber.

export type SequenceStep = {
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
    "You're getting this because you requested the free Paycheck Budget Worksheet on Paycheck Planner. " +
    '<a style="color:#6b7280;" href="' +
    unsubUrl +
    '">Unsubscribe</a></p>' +
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

export const SEQUENCE: SequenceStep[] = [
  {
    step: 0,
    dayOffset: 0,
    subject: "Your free paycheck budget worksheet",
    preview: "Here's the worksheet -- plus what to expect over the next two weeks.",
    bodyHtml: (unsubUrl) =>
      wrap(
        '<h2 style="color:#ffffff;margin-top:0;">Here\'s your worksheet</h2>' +
          '<p style="color:#9ca3af;">Thanks for grabbing the free Paycheck Budget Worksheet. It walks you through ' +
          "matching your bills to the specific paycheck that covers them -- the single biggest fix for running " +
          "out of money before payday.</p>" +
          cta("Open your worksheet", APP_URL + "/worksheet") +
          '<p style="color:#9ca3af;margin-top:24px;">Over the next two weeks I\'ll send five short emails on ' +
          "organizing your paycheck, avoiding the mistakes that keep people broke, paying off debt, saving " +
          "consistently, and pulling it all together. No fluff, just what to actually do.</p>",
        unsubUrl
      ),
  },
  {
    step: 1,
    dayOffset: 2,
    subject: "How to organize your paycheck (before you spend a cent)",
    preview: "The order matters more than the budget itself.",
    bodyHtml: (unsubUrl) =>
      wrap(
        '<h2 style="color:#ffffff;margin-top:0;">Organize before you spend</h2>' +
          '<p style="color:#9ca3af;">Most budgets fail because they try to plan a whole month at once, when bills ' +
          "actually arrive paycheck by paycheck. The fix is simple: the moment a paycheck lands, sort it into a " +
          "strict order before touching any of it.</p>" +
          '<ol style="color:#9ca3af;">' +
          "<li>Rent or mortgage</li>" +
          "<li>Utilities and phone</li>" +
          "<li>Minimum debt payments</li>" +
          "<li>Groceries and gas</li>" +
          "<li>Everything else</li>" +
          "</ol>" +
          '<p style="color:#9ca3af;">Whatever survives that order is what you actually have to spend -- not your ' +
          "bank balance, which still includes money that's already spoken for.</p>",
        unsubUrl
      ),
  },
  {
    step: 2,
    dayOffset: 4,
    subject: "The biggest paycheck budgeting mistake (it's not overspending)",
    preview: "It's treating every paycheck as if it's the same size.",
    bodyHtml: (unsubUrl) =>
      wrap(
        '<h2 style="color:#ffffff;margin-top:0;">It\'s not overspending</h2>' +
          '<p style="color:#9ca3af;">The mistake that trips up most paycheck-to-paycheck budgets isn\'t ' +
          "overspending -- it's treating every paycheck like it's identical. If you're paid biweekly, two months " +
          "a year you get a third paycheck. If your hours vary, no two paychecks are the same size at all.</p>" +
          '<p style="color:#9ca3af;">A budget built around a monthly average quietly breaks in exactly those ' +
          "weeks. The fix from the worksheet: plan against your actual next paycheck, not an average.</p>",
        unsubUrl
      ),
  },
  {
    step: 3,
    dayOffset: 7,
    subject: "A debt payoff plan that doesn't require a spreadsheet",
    preview: "Snowball vs. avalanche, and which one actually gets finished.",
    bodyHtml: (unsubUrl) =>
      wrap(
        '<h2 style="color:#ffffff;margin-top:0;">Snowball vs. avalanche</h2>' +
          '<p style="color:#9ca3af;">Two ways to pay off multiple debts: avalanche (highest interest rate first, ' +
          "saves the most money) or snowball (smallest balance first, gets you a quick win). The math favors " +
          "avalanche. The finish rate favors snowball, because momentum matters more than optimality for most " +
          "people.</p>" +
          '<p style="color:#9ca3af;">Pick whichever one you\'ll actually stick with for six months -- that beats ' +
          "the mathematically perfect plan you abandon in March.</p>" +
          cta("Read the full breakdown", APP_URL + "/blog/debt-snowball-vs-debt-avalanche"),
        unsubUrl
      ),
  },
  {
    step: 4,
    dayOffset: 10,
    subject: "How to actually save money from every paycheck",
    preview: "Not 'spend less' -- a specific mechanism that works even on a tight budget.",
    bodyHtml: (unsubUrl) =>
      wrap(
        '<h2 style="color:#ffffff;margin-top:0;">Save first, automatically</h2>' +
          '<p style="color:#9ca3af;">"Spend less" isn\'t a savings plan -- it\'s a hope. What actually works: the ' +
          "moment a paycheck lands, move a fixed amount -- even $10 -- to savings before it's available to " +
          "spend. It never has the chance to get spent on something else.</p>" +
          '<p style="color:#9ca3af;">Start smaller than feels meaningful. $10 a paycheck that actually happens ' +
          "beats $100 a paycheck that only happens twice.</p>",
        unsubUrl
      ),
  },
  {
    step: 5,
    dayOffset: 14,
    subject: "Put this on autopilot",
    preview: "Everything from the last two weeks, in one place.",
    bodyHtml: (unsubUrl) =>
      wrap(
        '<h2 style="color:#ffffff;margin-top:0;">Everything, in one place</h2>' +
          '<p style="color:#9ca3af;">Over the last two weeks: matching bills to paychecks, avoiding the ' +
          "average-paycheck trap, a debt payoff method you'll actually finish, and saving automatically before " +
          "you can spend it.</p>" +
          '<p style="color:#9ca3af;"><strong style="color:#ffffff;">Paycheck Planner</strong> does all four of ' +
          "those automatically -- lines your bills up against your real paycheck dates, tracks your debt payoff " +
          "plan, and moves savings before you see the money.</p>" +
          cta("Try Paycheck Planner free", APP_URL),
        unsubUrl
      ),
  },
]
