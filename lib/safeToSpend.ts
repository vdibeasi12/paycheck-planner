// lib/safeToSpend.ts
// Paycheck-cycle-aware Safe-to-Spend. Replaces the old flat-monthly version
// (income - bills - debt, "this calendar month") with a real pay-cycle
// version: "since your last paycheck, here's what's safe to spend until your
// next one." Pure and unit-testable, same pattern as lib/financialOverview.ts
// and lib/payoffSimulate.ts -- one source of truth so the Dashboard card,
// the What-If widget, and Survival Mode can never drift apart.
//
// Deliberately does NOT claim to know a real bank balance -- this app has no
// live checking-account connection (Plaid here is Liabilities-only). The
// "available cash" figure is the amount of the user's most recent paycheck,
// clearly framed as that in the UI, not a live balance.
//
// The shared date/projection primitives (income occurrences, bill/debt
// due-window sums, per-cycle goal contribution rate) live in
// lib/paycheckCycles.ts now -- lib/planResilience.ts (Paycheck Shield) builds
// on the same primitives to project every upcoming paycheck instead of just
// this one. This file's public API (computeSafeToSpend, whatIfSpend, and the
// exported types) is unchanged.

import {
  toISODate,
  daysBetween,
  projectIncomeOccurrences,
  sumDueInWindow,
  goalContributionRate,
  type CycleIncome,
  type CycleBill,
  type CycleDebt,
  type CycleGoal,
} from "./paycheckCycles"

// How far past/forward we're willing to scan looking for a paycheck date.
// 3 months comfortably covers even quarterly/annual income entries.
const SCAN_MONTHS_BACK = 2
const SCAN_MONTHS_FORWARD = 3

export type STSIncome = CycleIncome
export type STSBill = CycleBill
export type STSDebt = CycleDebt
export type STSGoal = CycleGoal

export type SafeToSpendResult = {
  hasIncome: boolean
  // False when income exists but every row is missing a pay date -- same
  // "can't project" state the Calendar page already flags.
  missingPayDate: boolean
  lastPaycheckDate: string | null
  lastPaycheckAmount: number
  nextPaycheckDate: string | null
  daysUntilNextPaycheck: number | null
  billsDue: number
  debtsDue: number
  goalContribution: number
  safeToSpend: number
  dailyLimit: number | null
  // What safeToSpend was actually computed from -- defaults to
  // lastPaycheckAmount/"lastPaycheck" here; see withStartingCash() below for
  // grounding this in a real balance (manual entry or a linked imported
  // account) instead of the projection-only default.
  startingCash: number
  startingCashSource: "lastPaycheck" | "manualBalance" | "linkedAccount"
  startingCashLabel: string | null
}

export type WhatIfVerdict = "fine" | "tight" | "not-recommended"

export type WhatIfResult = {
  newSafeToSpend: number
  // Same day-count the Daily limit card on Survival Mode uses -- null when
  // there's no meaningful "days until payday" to spread the remainder over
  // (e.g. payday is today).
  newDailyLimit: number | null
  verdict: WhatIfVerdict
}

export function computeSafeToSpend(input: {
  income: STSIncome[]
  bills: STSBill[]
  debts: STSDebt[]
  goals: STSGoal[]
  today?: Date
}): SafeToSpendResult {
  const today = input.today ?? new Date()
  const todayStr = toISODate(today)
  const hasIncome = input.income.length > 0
  const missingPayDate = hasIncome && input.income.every((i) => !i.next_pay_date)

  const empty: SafeToSpendResult = {
    hasIncome,
    missingPayDate,
    lastPaycheckDate: null,
    lastPaycheckAmount: 0,
    nextPaycheckDate: null,
    daysUntilNextPaycheck: null,
    billsDue: 0,
    debtsDue: 0,
    goalContribution: 0,
    safeToSpend: 0,
    dailyLimit: null,
    startingCash: 0,
    startingCashSource: "lastPaycheck",
    startingCashLabel: null,
  }
  if (!hasIncome || missingPayDate) return empty

  // Scan back far enough to find the most recent past paycheck, and forward
  // far enough to find the next one, regardless of where "today" falls
  // inside the current calendar month.
  const scanStartIdx = today.getFullYear() * 12 + today.getMonth() - SCAN_MONTHS_BACK
  const scanStartYear = Math.floor(scanStartIdx / 12)
  const scanStartMonth = ((scanStartIdx % 12) + 12) % 12
  const occurrences = projectIncomeOccurrences(
    input.income,
    scanStartYear,
    scanStartMonth,
    SCAN_MONTHS_BACK + SCAN_MONTHS_FORWARD + 1
  )

  const past = occurrences.filter((o) => o.date <= todayStr)
  const future = occurrences.filter((o) => o.date > todayStr)
  if (past.length === 0 || future.length === 0) {
    // No paycheck found in the scanned window on one side or the other --
    // most likely a brand-new income row whose next_pay_date hasn't
    // occurred yet. Nothing reliable to show.
    return empty
  }

  const lastPaycheckDate = past[past.length - 1].date
  const lastPaycheckAmount = past
    .filter((o) => o.date === lastPaycheckDate)
    .reduce((sum, o) => sum + o.amount, 0)

  const nextPaycheckDate = future[0].date

  const billsDue = sumDueInWindow(input.bills, todayStr, nextPaycheckDate)
  const debtsDue = sumDueInWindow(
    input.debts.map((d) => ({ amount: d.minimum_payment, due_date: d.due_date })),
    todayStr,
    nextPaycheckDate
  )
  const goalContribution = goalContributionRate(input.goals, input.income, todayStr)

  const safeToSpend = lastPaycheckAmount - billsDue - debtsDue - goalContribution
  const daysUntilNextPaycheck = Math.max(0, daysBetween(todayStr, nextPaycheckDate))
  const dailyLimit = daysUntilNextPaycheck > 0 ? safeToSpend / daysUntilNextPaycheck : safeToSpend

  return {
    hasIncome,
    missingPayDate,
    lastPaycheckDate,
    lastPaycheckAmount,
    nextPaycheckDate,
    daysUntilNextPaycheck,
    billsDue,
    debtsDue,
    goalContribution,
    safeToSpend,
    dailyLimit,
    startingCash: lastPaycheckAmount,
    startingCashSource: "lastPaycheck",
    startingCashLabel: null,
  }
}

// Re-grounds an already-computed Safe-to-Spend result in a real starting-
// cash figure (see lib/cashBalance.ts's resolveStartingCash()) instead of
// the projection-only lastPaycheckAmount -- same billsDue/debtsDue/
// goalContribution (still just "what's due before your next paycheck"),
// just a more accurate number to subtract them from. A no-op when the
// result couldn't be computed in the first place (no income/pay date).
export function withStartingCash(
  result: SafeToSpendResult,
  cash: { amount: number; source: SafeToSpendResult["startingCashSource"]; label: string | null }
): SafeToSpendResult {
  if (!result.hasIncome || result.missingPayDate || !result.nextPaycheckDate) {
    return result
  }
  const safeToSpend = cash.amount - result.billsDue - result.debtsDue - result.goalContribution
  const dailyLimit =
    result.daysUntilNextPaycheck != null && result.daysUntilNextPaycheck > 0
      ? safeToSpend / result.daysUntilNextPaycheck
      : safeToSpend
  return {
    ...result,
    safeToSpend,
    dailyLimit,
    startingCash: cash.amount,
    startingCashSource: cash.source,
    startingCashLabel: cash.label,
  }
}

// "Can I afford this?" -- purely a hypothetical against the current
// Safe-to-Spend number, no state changes. Verdict thresholds: still >= 20%
// of the original safe-to-spend left over is "fine"; still non-negative but
// under that cushion is "tight"; below zero is "not recommended."
//
// `amount` can be a single purchase or the summed total of several planned
// purchases (the Survival Mode "financial shopping cart" widget) -- the math
// is the same either way, it's just a subtraction against safeToSpend.
export function whatIfSpend(result: SafeToSpendResult, amount: number): WhatIfResult {
  const newSafeToSpend = result.safeToSpend - amount
  const cushion = result.safeToSpend * 0.2
  let verdict: WhatIfVerdict = "fine"
  if (newSafeToSpend < 0) verdict = "not-recommended"
  else if (newSafeToSpend < cushion) verdict = "tight"

  const days = result.daysUntilNextPaycheck
  const newDailyLimit = days != null && days > 0 ? newSafeToSpend / days : null

  return { newSafeToSpend, newDailyLimit, verdict }
}
