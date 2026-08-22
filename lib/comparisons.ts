// lib/comparisons.ts
// Honest head-to-head comparison pages (Aug 2026 growth-plan engine #3).
// Same split as lib/blog.ts / lib/calculators.ts: this module owns the
// data, app/compare/[slug]/page.tsx just renders it.
//
// Ground rules, per an explicit requirement from Vince (product owner):
// these are NOT "we're better at everything" pages. Every entry states
// what the competitor is genuinely good at and who it's actually the
// better pick for, not just where it falls short. Feature/pricing facts
// below were verified against each product's own pricing/marketing pages
// in August 2026 -- re-verify before reusing this content much later,
// since SaaS pricing changes.

export type ComparisonRow = {
  feature: string
  paycheckPlanner: string
  competitor: string
}

export type ComparisonMeta = {
  slug: string
  name: string
  tagline: string
  // What the competitor is genuinely good at -- stated plainly, not
  // hedged. If this section reads like faint praise, it's dishonest.
  competitorStrengths: string[]
  // Who should actually pick the competitor instead of Paycheck Planner.
  bestForCompetitor: string
  // Who should pick Paycheck Planner instead.
  bestForPaycheckPlanner: string
  rows: ComparisonRow[]
  pricingNote: string
  seoDescription: string
}

export const COMPARISONS: ComparisonMeta[] = [
  {
    slug: "ynab",
    name: "YNAB",
    tagline: "The zero-based budgeting standard-bearer",
    competitorStrengths: [
      "YNAB's \"Four Rules\" zero-based method has a genuinely devoted following and a long track record -- this isn't a fad methodology.",
      "Real-time bank sync across the US, Canada, UK, and EU, plus manual file-based import everywhere else.",
      "A subscription covers up to 6 people, which is a real deal for a household budgeting together.",
      "Deep, mature goal-tracking tools built specifically around the zero-based philosophy.",
    ],
    bestForCompetitor:
      "Someone who wants to learn and practice zero-based, envelope-style budgeting by category as their primary financial system, and doesn't mind paying a premium with no permanent free tier.",
    bestForPaycheckPlanner:
      "Someone who thinks in paychecks and debt payoff timelines rather than monthly spending categories, wants a real free tier to start on, and wants debt-freedom-date math built in rather than bolted on.",
    rows: [
      { feature: "Free tier", paycheckPlanner: "Yes, ongoing", competitor: "34-day trial only, no permanent free plan" },
      { feature: "Starting price", paycheckPlanner: "$3.99/mo (Momentum)", competitor: "$9.08/mo billed annually, or $14.99/mo" },
      { feature: "Core method", paycheckPlanner: "Paycheck-based cash flow + debt payoff planning", competitor: "Zero-based envelope budgeting (\"give every dollar a job\")" },
      { feature: "Debt payoff planning", paycheckPlanner: "Built-in snowball/avalanche comparison with a payoff date", competitor: "Debt tools available, but budgeting-category-first, not payoff-date-first" },
      { feature: "Bank sync", paycheckPlanner: "Yes (Plaid, liabilities)", competitor: "Yes (US/Canada/UK/EU; file import elsewhere)" },
      { feature: "Built for biweekly/irregular pay", paycheckPlanner: "Yes -- purpose-built around paycheck timing", competitor: "Not specifically -- built around monthly category budgets" },
    ],
    pricingNote:
      "YNAB pricing and trial terms as of August 2026, per ynab.com/pricing. Paycheck Planner pricing per paycheckplanner.ai/pricing.",
    seoDescription:
      "Paycheck Planner vs YNAB: an honest comparison of pricing, bank sync, and budgeting philosophy -- zero-based envelope budgeting vs paycheck-based cash flow and debt payoff planning.",
  },
  {
    slug: "everydollar",
    name: "EveryDollar",
    tagline: "Dave Ramsey's budgeting app, built around the Baby Steps",
    competitorStrengths: [
      "A genuinely usable free tier for manual, zero-based monthly budgeting with unlimited categories.",
      "Directly integrated with Ramsey's Baby Steps method, which is a real, well-known framework a lot of people are already following.",
      "Premium adds live coaching sessions and weekly group Q&As -- human support most budgeting apps don't offer at any price.",
      "Simple, uncluttered interface focused on one thing: this month's budget.",
    ],
    bestForCompetitor:
      "Someone already following (or wanting to follow) Dave Ramsey's Baby Steps specifically, who values live coaching access and doesn't mind manual entry unless they upgrade to Premium for bank sync.",
    bestForPaycheckPlanner:
      "Someone who wants bank-linked debt tracking on the free tier from day one, and wants their budget built around when paychecks actually land rather than a generic monthly calendar.",
    rows: [
      { feature: "Free tier bank sync", paycheckPlanner: "Yes, included free", competitor: "No -- bank sync requires Premium" },
      { feature: "Starting paid price", paycheckPlanner: "$3.99/mo (Momentum)", competitor: "$6.67/mo billed annually ($79.99/yr), or $17.99/mo" },
      { feature: "Core method", paycheckPlanner: "Paycheck-based cash flow + debt payoff planning", competitor: "Zero-based monthly budgeting, Ramsey Baby Steps-aligned" },
      { feature: "Debt strategy comparison", paycheckPlanner: "Snowball vs avalanche, with payoff date + interest saved", competitor: "Baby Steps debt snowball, not a payoff-date calculator" },
      { feature: "Live human coaching", paycheckPlanner: "Not offered", competitor: "Included on Premium" },
      { feature: "Built for biweekly/irregular pay", paycheckPlanner: "Yes", competitor: "Not specifically -- monthly-calendar budgeting" },
    ],
    pricingNote:
      "EveryDollar pricing and features as of August 2026, per Ramsey Solutions' own EveryDollar pages. Paycheck Planner pricing per paycheckplanner.ai/pricing.",
    seoDescription:
      "Paycheck Planner vs EveryDollar: free bank sync and paycheck-based debt payoff planning compared against EveryDollar's free manual budgeting and paid Ramsey-method coaching.",
  },
  {
    slug: "rocket-money",
    name: "Rocket Money",
    tagline: "The subscription-cancellation and bill-negotiation app",
    competitorStrengths: [
      "Genuinely excellent at what it's actually built for: finding and canceling unwanted subscriptions, and negotiating bills down.",
      "Bill negotiation is available to everyone free upfront -- you only pay a cut (35-60%) of what it actually saves you.",
      "Free tier includes credit score tracking and 3+ months of transaction history, which is more generous than most free budgeting apps.",
      "\"Pay what you think is fair\" premium pricing is an unusual, customer-friendly model.",
    ],
    bestForCompetitor:
      "Someone whose main problem is unwanted subscriptions and inflated bills, who wants those found and negotiated down with minimal effort -- budgeting is a secondary feature for Rocket Money, not the core product.",
    bestForPaycheckPlanner:
      "Someone whose main problem is building an actual budget and a debt-freedom plan, not auditing subscriptions -- Rocket Money's free budgeting caps out at 2 categories, which isn't enough to run a real household budget on.",
    rows: [
      { feature: "Free tier budget categories", paycheckPlanner: "Unlimited", competitor: "2 categories only" },
      { feature: "Debt payoff planning", paycheckPlanner: "Snowball/avalanche comparison with a payoff date", competitor: "Not a core feature" },
      { feature: "Subscription cancellation", paycheckPlanner: "Not offered", competitor: "Included on Premium" },
      { feature: "Bill negotiation", paycheckPlanner: "Not offered", competitor: "Free to try; fee only on savings achieved" },
      { feature: "Premium price", paycheckPlanner: "$3.99-$11.99/mo, fixed tiers", competitor: "\"Pay what you think is fair,\" typically $7-$14/mo" },
      { feature: "Built for biweekly/irregular pay", paycheckPlanner: "Yes", competitor: "Not specifically" },
    ],
    pricingNote:
      "Rocket Money pricing and features as of August 2026, per rocketmoney.com. Paycheck Planner pricing per paycheckplanner.ai/pricing.",
    seoDescription:
      "Paycheck Planner vs Rocket Money: a real budget and debt payoff plan vs Rocket Money's subscription-cancellation and bill-negotiation focus, with an honest look at what each is actually built for.",
  },
  {
    slug: "goodbudget",
    name: "Goodbudget",
    tagline: "Digital envelope budgeting, no bank connection required",
    competitorStrengths: [
      "Never requires linking a bank account -- a real, deliberate choice for anyone who wants zero third-party bank-data sharing.",
      "The envelope method it's built around is simple to understand and easy to explain to a partner or family.",
      "Free tier supports up to 20 envelopes and 2 devices, which is enough for a lot of household budgets.",
      "Multi-user support (Plus tier: unlimited users, 5 devices) makes it genuinely good for a family budgeting together.",
    ],
    bestForCompetitor:
      "Someone who specifically wants to budget by manually-managed envelopes without connecting any bank account, and is comfortable entering transactions by hand (or importing a downloaded statement).",
    bestForPaycheckPlanner:
      "Someone who wants their debts and balances tracked automatically instead of typed in by hand, and wants a computed debt-freedom date rather than an envelope balance.",
    rows: [
      { feature: "Bank sync", paycheckPlanner: "Yes (Plaid, liabilities)", competitor: "No -- manual entry, optional statement import" },
      { feature: "Free tier limits", paycheckPlanner: "Unlimited budget categories", competitor: "20 envelopes, 2 devices, 1 year of history" },
      { feature: "Plus/paid price", paycheckPlanner: "$3.99/mo (Momentum)", competitor: "$7/mo or $60/yr" },
      { feature: "Debt payoff planning", paycheckPlanner: "Snowball/avalanche comparison with a payoff date", competitor: "Envelope-based saving toward debt, not a payoff-date calculator" },
      { feature: "Core method", paycheckPlanner: "Paycheck-based cash flow + debt payoff planning", competitor: "Manual envelope budgeting" },
      { feature: "Built for biweekly/irregular pay", paycheckPlanner: "Yes", competitor: "Not specifically" },
    ],
    pricingNote:
      "Goodbudget pricing and limits as of August 2026, per goodbudget.com and its published plan comparison. Paycheck Planner pricing per paycheckplanner.ai/pricing.",
    seoDescription:
      "Paycheck Planner vs Goodbudget: automatic bank-linked debt tracking and paycheck-based budgeting compared against Goodbudget's manual, no-bank-connection envelope system.",
  },
]

export function getComparison(slug: string): ComparisonMeta | undefined {
  return COMPARISONS.find((c) => c.slug === slug)
}
