// lib/payoffEngine.ts
// Thin wrapper around the shared simulation in financeEngine so both
// engines share identical math and an identical `Debt` shape.

import { simulatePayoff, Strategy } from "./financeEngine"
import type { Debt as EngineDebt } from "./financeEngine"

export type Debt = EngineDebt

export interface PayoffSummary {
  months: number
  totalInterest: number
  totalPaid: number
  paidOff: boolean
}

/** Quick summary for a given strategy + optional extra monthly payment. */
export function calculatePayoff(
  debts: Debt[] | null | undefined,
  strategy: Strategy = "avalanche",
  extra: number = 0
): PayoffSummary {
  const r = simulatePayoff(debts, strategy, extra)
  return {
    months: r.months,
    totalInterest: r.totalInterest,
    totalPaid: r.totalPaid,
    paidOff: r.paidOff,
  }
}

/** Summary plus the full month-by-month timeline. */
export function calculateDebtFreeTimeline(
  debts: Debt[] | null | undefined,
  strategy: Strategy = "snowball",
  extra: number = 0
) {
  const r = simulatePayoff(debts, strategy, extra)
  return {
    months: r.months,
    totalInterest: r.totalInterest,
    totalPaid: r.totalPaid,
    paidOff: r.paidOff,
    timeline: r.timeline,
  }
}
