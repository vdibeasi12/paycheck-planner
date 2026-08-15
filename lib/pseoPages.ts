// lib/pseoPages.ts
// Programmatic SEO pages (Task #24): budget breakdowns by salary and payoff
// plans by debt amount. Every figure on these pages is a real calculation --
// lib/salaryBudget.ts's bracket-based tax math and lib/payoffSimulate.ts's
// actual amortization engine (the same engine behind the real Payoff Plan
// page), not placeholder text -- per the explicit requirement that these NOT
// be thin templated pages.
//
// Single dynamic route (app/[pseoSlug]/page.tsx) serves both page families:
// Next.js route segments can't mix static text with a dynamic param in one
// folder name (e.g. "budget-on-[amount]-salary" is not a legal folder), so
// this module owns the slug<->data mapping and the route just looks it up.

import { estimateSalaryBreakdown, budgetSplit, recommendedMonthlyHousing } from "./salaryBudget"
import { simulate, type Debt } from "./payoffSimulate"

export const SALARY_AMOUNTS = [
  30_000, 40_000, 50_000, 60_000, 70_000, 80_000, 90_000, 100_000, 110_000, 120_000, 130_000, 140_000, 150_000,
]

export const DEBT_AMOUNTS = [1_000, 2_500, 5_000, 10_000, 15_000, 20_000, 30_000, 50_000, 75_000, 100_000]

// A representative APR for the debt-amount pages -- close to typical U.S.
// credit card APRs, and called out explicitly in the page copy as an
// assumption rather than presented as any specific reader's real rate.
export const ASSUMED_APR = 22.0

export function salarySlug(amount: number): string {
  return `budget-on-${amount}-salary`
}

export function debtSlug(amount: number): string {
  return `payoff-plan-for-${amount}-in-debt`
}

export function parseSalarySlug(slug: string): number | null {
  const m = /^budget-on-(\d+)-salary$/.exec(slug)
  if (!m) return null
  const amount = Number(m[1])
  return SALARY_AMOUNTS.includes(amount) ? amount : null
}

export function parseDebtSlug(slug: string): number | null {
  const m = /^payoff-plan-for-(\d+)-in-debt$/.exec(slug)
  if (!m) return null
  const amount = Number(m[1])
  return DEBT_AMOUNTS.includes(amount) ? amount : null
}

export function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

export type SalaryPageData = {
  amount: number
  slug: string
  breakdown: ReturnType<typeof estimateSalaryBreakdown>
  split: ReturnType<typeof budgetSplit>
  recommendedHousing: number
  // Illustration: what putting the 50/30/20 "savings & extra debt payment"
  // share toward a common $5,000 credit-card balance looks like at this
  // income level -- ties the salary math directly to a real payoff outcome.
  payoffExample: {
    startingBalance: number
    apr: number
    extraPayment: number
    months: number
    totalInterest: number
    nonAmortizing: boolean
  }
}

export function getSalaryPageData(amount: number): SalaryPageData | null {
  if (!SALARY_AMOUNTS.includes(amount)) return null
  const breakdown = estimateSalaryBreakdown(amount)
  const split = budgetSplit(breakdown.netMonthly)
  const recommendedHousing = recommendedMonthlyHousing(amount)

  const exampleBalance = 5_000
  const debts: Debt[] = [
    {
      id: "example",
      name: "Credit card",
      balance: exampleBalance,
      interest_rate: ASSUMED_APR,
      minimum_payment: Math.max(25, Math.round(exampleBalance * 0.02)),
    },
  ]
  const sim = simulate(debts, "avalanche", split.savingsAndDebt, new Date())

  return {
    amount,
    slug: salarySlug(amount),
    breakdown,
    split,
    recommendedHousing,
    payoffExample: {
      startingBalance: exampleBalance,
      apr: ASSUMED_APR,
      extraPayment: split.savingsAndDebt,
      months: sim.months,
      totalInterest: sim.totalInterest,
      nonAmortizing: sim.nonAmortizing,
    },
  }
}

export type DebtScenario = {
  monthlyPayment: number
  months: number
  totalInterest: number
  totalPaid: number
  nonAmortizing: boolean
  capped: boolean
}

export type DebtPageData = {
  amount: number
  slug: string
  apr: number
  minimumOnlyPayment: number
  scenarios: DebtScenario[]
}

export function getDebtPageData(amount: number): DebtPageData | null {
  if (!DEBT_AMOUNTS.includes(amount)) return null

  // A spread of realistic monthly payments: an estimated minimum-only
  // payment (2% of balance, floored at $25) plus payment tiers scaled off
  // this balance's own starting interest, not fixed dollar amounts -- a
  // flat $100/$200/$300 step list looks fine at $1,000 but is entirely
  // interest-only (every row "never pays off") at $75,000+, since the
  // starting interest alone is already $1,375+/month there. Scaling by
  // multiples of the starting interest keeps every tier meaningfully above
  // interest-only at every balance in DEBT_AMOUNTS.
  const monthlyInterestAtStart = Math.round(((amount * ASSUMED_APR) / 100 / 12) * 100) / 100
  const minimumOnlyPayment = Math.max(25, Math.round(amount * 0.02))
  const roundTo = amount >= 20_000 ? 25 : amount >= 5_000 ? 10 : 5
  const multiplierSteps = [1.5, 2, 3, 5, 8].map(
    (m) => Math.max(roundTo, Math.round((monthlyInterestAtStart * m) / roundTo) * roundTo)
  )
  const steps = Array.from(new Set([minimumOnlyPayment, ...multiplierSteps]))
    .filter((p) => p > 0 && p < amount)
    .sort((a, b) => a - b)
    .slice(0, 6)

  const scenarios: DebtScenario[] = steps.map((payment) => {
    const debts: Debt[] = [{ id: "d", name: "Debt", balance: amount, interest_rate: ASSUMED_APR, minimum_payment: payment }]
    const sim = simulate(debts, "avalanche", 0, new Date())
    return {
      monthlyPayment: payment,
      months: sim.months,
      totalInterest: sim.totalInterest,
      totalPaid: sim.totalPaid,
      nonAmortizing: sim.nonAmortizing,
      capped: sim.capped,
    }
  })

  return { amount, slug: debtSlug(amount), apr: ASSUMED_APR, minimumOnlyPayment, scenarios }
}
