// lib/financeEngine.ts
// Compatibility shim over the canonical simulation engine in
// lib/payoffSimulate.ts (the engine behind the actual Payoff Plan page).
//
// This file used to have its own separate month-by-month simulation that
// could produce different numbers than the Payoff Plan page for the exact
// same debts -- different per-step rounding (this file only rounded
// totals at the end, letting floating-point drift accumulate over a long
// payoff), a priority order computed once at the start instead of
// recomputed monthly, and no early exit when minimums never cover
// interest (it would silently compound for up to 1200 months instead of
// detecting the non-amortizing case immediately). Consolidated onto
// payoffSimulate.ts Aug 13, 2026 so the numbers can never drift apart
// between the Payoff Plan page and everything that uses this file (AI
// Advisor, scenario simulator, charts, Report page via financeInsights.ts).
//
// Every existing export here (types and functions) keeps its exact same
// name, parameters, and return shape -- callers do not need to change.
// Only the numbers underneath get more accurate.

import { simulate as runSimulation } from "./payoffSimulate"
import type { Debt as EngineDebt } from "./payoffSimulate"

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
  paidOff: boolean // false when minimums never cover interest, or the simulation hit its cap
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Core simulation. Returns full month-by-month timeline plus totals.
 * `extra` is an additional amount applied each month, on top of the sum of
 * all minimum payments, to the highest-priority debt.
 *
 * Delegates to lib/payoffSimulate.ts's `simulate()`. Note: payoffSimulate
 * supports two avalanche variants (highest-rate-first or highest-balance-
 * first) and the Payoff Plan page's own UI defaults to highest-balance --
 * this shim does not override that default, so "avalanche" here matches
 * what the Payoff Plan page shows by default.
 */
export function simulatePayoff(
  debts: Debt[] | null | undefined,
  strategy: Strategy = "avalanche",
  extra: number = 0
): PayoffResult {
  const list = Array.isArray(debts) ? debts : []

  // payoffSimulate.ts's Debt type requires id/name -- synthesize stable
  // fallbacks for callers here that only ever supplied balance/
  // interest_rate/minimum_payment (this file's Debt type made those optional).
  const normalized: EngineDebt[] = list.map((d, i) => ({
    id: d.id || `debt-${i}`,
    name: d.name || "Debt",
    balance: Math.max(0, Number(d?.balance) || 0),
    interest_rate: Math.max(0, Number(d?.interest_rate) || 0),
    minimum_payment: Math.max(0, Number(d?.minimum_payment) || 0),
  }))

  const active = normalized.filter((d) => d.balance > 0)
  const startingBalance = round2(active.reduce((s, d) => s + d.balance, 0))

  if (active.length === 0) {
    return {
      months: 0,
      totalInterest: 0,
      totalPaid: 0,
      timeline: [{ month: 0, remainingBalance: 0, interestPaid: 0 }],
      paidOff: true,
    }
  }

  const sim = runSimulation(normalized, strategy, extra, new Date())

  const timeline: TimelinePoint[] = [
    { month: 0, remainingBalance: startingBalance, interestPaid: 0 },
    ...sim.monthlyRows.map((r) => ({
      month: r.month,
      remainingBalance: r.endBalance,
      interestPaid: r.interest,
    })),
  ]

  return {
    months: sim.months,
    totalInterest: sim.totalInterest,
    totalPaid: sim.totalPaid,
    timeline,
    paidOff: !sim.nonAmortizing && !sim.capped,
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
