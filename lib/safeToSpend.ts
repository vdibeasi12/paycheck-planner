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
  addDays,
  daysBetween,
  endOfMonthISO,
  projectIncomeOccurrences,
  sumDueInWindow,
  sumTransfersInWindow,
  excludeTransferCoveredDebts,
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
  // Still computed/kept for other pages (Paycheck Surplus's "did a cycle
  // just close" detection, cross-links) -- no longer what Safe to Spend's
  // own window is measured against, see windowEndDate below.
  nextPaycheckDate: string | null
  daysUntilNextPaycheck: number | null
  // CRITICAL FIX (Sep 9 2026, Vince): "If I receive two paychecks a month
  // you need to subtract all bills for that month which will determine safe
  // to spend." The window billsDue/debtsDue are summed over now runs from
  // the last paycheck through the END OF THE CURRENT CALENDAR MONTH (see
  // lib/paycheckCycles.ts's endOfMonthISO), not just through the next
  // paycheck -- so a bill or debt landing later in the same month, even
  // after another paycheck or two, is always reserved from today's real
  // cash rather than waiting for its own cycle to roll around. null only
  // when there's no projectable plan at all (same conditions as
  // nextPaycheckDate being null).
  windowEndDate: string | null
  // daysBetween(today, windowEndDate) -- what dailyLimit below actually
  // divides by now, replacing daysUntilNextPaycheck for that purpose.
  daysUntilWindowEnd: number | null
  billsDue: number
  debtsDue: number
  // Money already swept out to another of the user's own accounts on the
  // same day as lastPaycheckDate (an automatic transfer that funds a
  // mortgage/car loan/personal loan elsewhere, say) -- real money that left
  // before any of it was ever "safe to spend." Folded into the default
  // startingCash below; debts actually paid FROM that transfer are excluded
  // from debtsDue entirely (see CycleDebt.covered_by_transfer) so they're
  // never subtracted twice.
  transfersOut: number
  safeToSpend: number
  dailyLimit: number | null
  // What safeToSpend was actually computed from -- defaults to
  // lastPaycheckAmount/"lastPaycheck" here; see withStartingCash() below for
  // grounding this in a real Checking balance (lib/cashBalance.ts) projected
  // forward to today, instead of the projection-only default.
  startingCash: number
  startingCashSource: "lastPaycheck" | "checking"
  // The Checking balance's balance_as_of date when startingCashSource is
  // "checking" -- null otherwise. Lets the UI say "as of Sept 1" instead of
  // implying a live bank feed.
  startingCashAsOf: string | null
  // Set only by floorSafeToSpend() below (Sep 9 2026, Vince: "53rd is not
  // counting the personal loan and it needs to earmark the up coming
  // mortgage payment") -- the date of the future paycheck cycle this number
  // got pulled down to protect, when a LATER cycle turns out tighter than
  // the immediate window above. Undefined/null means the immediate window
  // itself is the binding constraint, same as today.
  reservedThroughDate?: string | null
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
  // CRITICAL FIX (Sep 9 2026, Vince): "don't calculate savings in safe to
  // spend." Kept in the input shape only so every existing caller (pages,
  // lib/accountSafeToSpend.ts, tests) can keep passing whatever goals they
  // already fetch without every call site needing an edit -- it is no
  // longer read anywhere in this function, and goal/savings contributions no
  // longer reduce safeToSpend at all.
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
    windowEndDate: null,
    daysUntilWindowEnd: null,
    billsDue: 0,
    debtsDue: 0,
    transfersOut: 0,
    safeToSpend: 0,
    dailyLimit: null,
    startingCash: 0,
    startingCashSource: "lastPaycheck",
    startingCashAsOf: null,
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

  // CRITICAL FIX (Sep 9 2026, Vince): "If I receive two paychecks a month
  // you need to subtract all bills for that month which will determine safe
  // to spend." The window now runs from the last paycheck through the END
  // OF THE CURRENT CALENDAR MONTH, not just through the next paycheck -- so
  // a debt like Avant, due the 22nd, is reserved the moment the month
  // starts even if a paycheck lands before the 22nd, instead of only
  // showing up once it happens to fall inside a narrower cycle window.
  // Still starts at `lastPaycheckDate` rather than `todayStr` (see the prior
  // Sep 9 fix this replaces) so anything already due and unpaid stays
  // reserved the same way it always has.
  const windowEndDate = endOfMonthISO(today)
  const billsDue = sumDueInWindow(input.bills, lastPaycheckDate, windowEndDate)
  const debtsDue = sumDueInWindow(
    excludeTransferCoveredDebts(input.debts, input.income).map((d) => ({
      amount: d.minimum_payment,
      due_date: d.due_date,
      grace_period_days: d.grace_period_days,
      paid_through: d.paid_through,
    })),
    lastPaycheckDate,
    windowEndDate
  )

  // The transfer tied to the paycheck that already landed (same day, same
  // schedule as lastPaycheckDate) -- money that's already gone by the time
  // this is being asked, whether or not the user's tracked a real balance.
  // Only ever subtracted from the lastPaycheck-projection fallback below;
  // a real account balance (withStartingCash) already reflects it, since
  // lastPaycheckDate is always in the past.
  const dayBeforeLastPaycheck = toISODate(addDays(new Date(lastPaycheckDate + "T00:00:00"), -1))
  const transfersOut = sumTransfersInWindow(input.income, dayBeforeLastPaycheck, lastPaycheckDate)

  const startingCash = lastPaycheckAmount - transfersOut
  const safeToSpend = startingCash - billsDue - debtsDue
  const daysUntilNextPaycheck = Math.max(0, daysBetween(todayStr, nextPaycheckDate))
  const daysUntilWindowEnd = Math.max(0, daysBetween(todayStr, windowEndDate))
  const dailyLimit = daysUntilWindowEnd > 0 ? safeToSpend / daysUntilWindowEnd : safeToSpend

  return {
    hasIncome,
    missingPayDate,
    lastPaycheckDate,
    lastPaycheckAmount,
    nextPaycheckDate,
    daysUntilNextPaycheck,
    windowEndDate,
    daysUntilWindowEnd,
    billsDue,
    debtsDue,
    transfersOut,
    safeToSpend,
    dailyLimit,
    startingCash,
    startingCashSource: "lastPaycheck",
    startingCashAsOf: null,
  }
}

// Re-grounds an already-computed Safe-to-Spend result in a real Checking
// balance projected forward to today (see lib/cashBalance.ts's
// resolveStartingCash()) instead of the projection-only lastPaycheckAmount.
// Same billsDue/debtsDue (still just "what's due through windowEndDate"),
// just a more accurate number to subtract them from. A no-op when the
// result couldn't be computed in the first place (no income/pay date).
export function withStartingCash(
  result: SafeToSpendResult,
  cash: { amount: number; source: SafeToSpendResult["startingCashSource"]; asOf: string | null }
): SafeToSpendResult {
  if (!result.hasIncome || result.missingPayDate || !result.nextPaycheckDate) {
    return result
  }
  const safeToSpend = cash.amount - result.billsDue - result.debtsDue
  const dailyLimit =
    result.daysUntilWindowEnd != null && result.daysUntilWindowEnd > 0
      ? safeToSpend / result.daysUntilWindowEnd
      : safeToSpend
  return {
    ...result,
    safeToSpend,
    dailyLimit,
    startingCash: cash.amount,
    startingCashSource: cash.source,
    startingCashAsOf: cash.asOf,
  }
}

// CRITICAL FIX (Sep 9 2026, Vince, live screenshot of 53rd Checking): "53rd
// is not counting the personal loan and it needs to earmark the up coming
// mortgage payment... reduce Safe to Spend itself." The immediate window
// above (this cycle only) is what a person actually asked "can I spend
// this" would want -- but if a LATER cycle's own paycheck doesn't cover
// that cycle's own bills/debts by enough to keep the running balance (fed
// by TODAY's number never having been spent) above what it needs, spending
// everything safeToSpend allows today would leave that later cycle short.
// lib/debtPayoffSafety.ts's computeMultiCycleFloor runs the exact same
// multi-cycle search Extra Debt Payment already uses (so the two can never
// contradict each other) and this floors safeToSpend at it whenever it's
// tighter than the immediate window -- a no-op whenever, like Vince's real
// 53rd numbers turned out to be, later cycles are actually healthier than
// the very next one.
export function floorSafeToSpend(
  result: SafeToSpendResult,
  floor: { balance: number; date: string | null }
): SafeToSpendResult {
  if (!result.hasIncome || result.missingPayDate || !result.nextPaycheckDate) {
    return result
  }
  // The immediate window is already at least as tight, or the "tighter"
  // point IS this same cycle (date null means today, which this result
  // already reflects) -- nothing to floor.
  if (floor.balance >= result.safeToSpend || floor.date === null) {
    return result
  }
  const safeToSpend = floor.balance
  const dailyLimit =
    result.daysUntilWindowEnd != null && result.daysUntilWindowEnd > 0
      ? safeToSpend / result.daysUntilWindowEnd
      : safeToSpend
  return {
    ...result,
    safeToSpend,
    dailyLimit,
    reservedThroughDate: floor.date,
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

  const days = result.daysUntilWindowEnd
  const newDailyLimit = days != null && days > 0 ? newSafeToSpend / days : null

  return { newSafeToSpend, newDailyLimit, verdict }
}
