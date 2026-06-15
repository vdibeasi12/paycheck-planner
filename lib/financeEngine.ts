// lib/financeEngine.ts
// Real debt-payoff math (no placeholder logic).
// Month-by-month amortization that supports snowball + avalanche strategies
// and rolls freed-up minimum payments into the target debt (the "snowball" effect).

export type Strategy = "snowball" | "avalanche"

export interface Debt {
  id?: string
  name?: string
  balance: number
  interest_rate: number // annual percent, e.g. 19.99
  minimum_payment: number
}

export interface TimelinePoint {
  month: number
  remainingBalance: number
  interestPaid: number
}

export interface PayoffResult {
  months: number
  totalInterest: number
  totalPaid: number
  timeline: TimelinePoint[]
  paidOff: boolean // false when minimums never cover interest within the cap
}

const MAX_MONTHS = 1200 // 100-year safety cap to avoid infinite loops

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}

interface WorkingDebt {
  balance: number
  monthlyRate: number
  min: number
}

/**
 * Core simulation. Returns full month-by-month timeline plus totals.
 * `extra` is an additional amount applied each month, on top of the sum of
 * all minimum payments, to the highest-priority debt.
 */
export function simulatePayoff(
  debts: Debt[] | null | undefined,
  strategy: Strategy = "avalanche",
  extra: number = 0
): PayoffResult {
  const working: WorkingDebt[] = (Array.isArray(debts) ? debts : [])
    .map((d) => ({
      balance: Math.max(0, Number(d?.balance) || 0),
      monthlyRate: (Math.max(0, Number(d?.interest_rate) || 0) / 100) / 12,
      min: Math.max(0, Number(d?.minimum_payment) || 0),
    }))
    .filter((d) => d.balance > 0)

  const startingBalance = round2(sum(working.map((d) => d.balance)))
  const timeline: TimelinePoint[] = [
    { month: 0, remainingBalance: startingBalance, interestPaid: 0 },
  ]

  if (working.length === 0) {
    return { months: 0, totalInterest: 0, totalPaid: 0, timeline, paidOff: true }
  }

  // Fixed monthly budget = sum of every minimum + extra. As debts are cleared,
  // their minimums stay in the budget and roll onto the target debt.
  const monthlyBudget = sum(working.map((d) => d.min)) + Math.max(0, Number(extra) || 0)

  // Priority order of indices.
  const priority = working
    .map((_, i) => i)
    .sort((a, b) =>
      strategy === "snowball"
        ? working[a].balance - working[b].balance
        : working[b].monthlyRate - working[a].monthlyRate
    )

  let totalInterest = 0
  let totalPaid = 0
  let month = 0

  while (working.some((d) => d.balance > 0.005) && month < MAX_MONTHS) {
    month++

    // 1) accrue interest
    let monthInterest = 0
    for (const d of working) {
      if (d.balance > 0) {
        const interest = d.balance * d.monthlyRate
        d.balance += interest
        monthInterest += interest
      }
    }
    totalInterest += monthInterest

    // 2) pay minimums (capped to balance)
    let budget = monthlyBudget
    for (const d of working) {
      if (d.balance > 0 && d.min > 0) {
        const pay = Math.min(d.min, d.balance)
        d.balance -= pay
        budget -= pay
        totalPaid += pay
      }
    }

    // 3) apply remaining budget to highest-priority debts
    for (const idx of priority) {
      if (budget <= 0.005) break
      const d = working[idx]
      if (d.balance > 0) {
        const pay = Math.min(budget, d.balance)
        d.balance -= pay
        budget -= pay
        totalPaid += pay
      }
    }

    timeline.push({
      month,
      remainingBalance: round2(sum(working.map((d) => Math.max(0, d.balance)))),
      interestPaid: round2(monthInterest),
    })
  }

  const paidOff = working.every((d) => d.balance <= 0.005)

  return {
    months: month,
    totalInterest: round2(totalInterest),
    totalPaid: round2(totalPaid),
    timeline,
    paidOff,
  }
}

/** Timeline of total remaining balance per month (month 0 = today). */
export function calculatePayoffTimeline(
  debts: Debt[] | null | undefined,
  strategy: Strategy = "avalanche"
): TimelinePoint[] {
  return simulatePayoff(debts, strategy, 0).timeline
}

/** Number of months until debt-free under the given strategy. */
export function calculateDebtFreeMonths(
  debts: Debt[] | null | undefined,
  strategy: Strategy = "avalanche"
): number {
  return simulatePayoff(debts, strategy, 0).months
}
