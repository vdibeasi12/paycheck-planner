// lib/financeInsights.ts
// Human-friendly insight helpers built on the shared payoff simulation.

import { simulatePayoff } from "./financeEngine"
import type { Debt, Strategy } from "./financeEngine"

/**
 * Returns a readable target date string, e.g. "March 2027".
 * Returns "—" when there are no debts and "Not on track" when minimums
 * never cover interest.
 */
export function calculateDebtFreeDate(
  debts: Debt[] | null | undefined,
  strategy: Strategy = "avalanche"
): string {
  const result = simulatePayoff(debts, strategy, 0)
  if (result.months === 0) return "—"
  if (!result.paidOff) return "Not on track"

  const target = new Date()
  target.setMonth(target.getMonth() + result.months)
  return target.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

/** Total interest paid across the life of the debts under the strategy. */
export function calculateTotalInterestPaid(
  debts: Debt[] | null | undefined,
  strategy: Strategy = "avalanche"
): number {
  return simulatePayoff(debts, strategy, 0).totalInterest
}

/**
 * Interest saved by paying `extra` more per month vs. minimums only.
 * Never returns a negative number.
 */
export function calculatePotentialSavings(
  debts: Debt[] | null | undefined,
  extra: number = 100,
  strategy: Strategy = "avalanche"
): number {
  const baseline = simulatePayoff(debts, strategy, 0).totalInterest
  const accelerated = simulatePayoff(debts, strategy, extra).totalInterest
  return Math.max(0, Math.round(baseline - accelerated))
}
