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
  projectBalanceTimeline,
  projectionHorizonISO,
  sumDueInWindow,
  sumTransfersInWindow,
  excludeTransferCoveredDebts,
  type CycleIncome,
  type CycleBill,
  type CycleDebt,
  type CycleGoal,
  type BalanceTimeline,
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
  // CRITICAL FIX (Sep 10 2026, Vince) -- see projectBalanceTimeline in
  // lib/paycheckCycles.ts for the full root cause. safeToSpend above is now
  // the LOWEST point of the projected balance between today and the horizon,
  // not "starting cash minus a month of obligations with no income credited."
  // Everything below supports that number.

  // The date the projected balance bottoms out, or null when nothing ahead
  // dips below what's on hand today.
  lowestDate: string | null
  // Paychecks landing, and obligations coming due, from today through the low
  // point INCLUSIVE. startingCash + incomeThroughLowest - outflowThroughLowest
  // === safeToSpend, exactly, so the UI breakdown can always reproduce the
  // headline.
  incomeThroughLowest: number
  outflowThroughLowest: number
  // Every paycheck/bill/debt event across the whole horizon with a running
  // balance attached -- what the "What's committed" list renders from.
  timeline: BalanceTimeline | null
  // Total real income arriving between today and the end of the same window
  // billsDue/debtsDue are measured over. Surfaced because its ABSENCE was the
  // bug: a card that subtracts 20 days of obligations has to show the 20 days
  // of pay alongside it or it is lying by omission.
  incomeInWindow: number

  // Internal. The inputs projectBalanceTimeline needs, carried on the result
  // so withStartingCash() can rebuild the projection against a real bank
  // balance without every existing call site having to pass them a second
  // time. Not for display; nothing outside this file should read it.
  _projection?: {
    income: STSIncome[]
    bills: STSBill[]
    debts: STSDebt[]
    todayISO: string
    horizonISO: string
    lastPaycheckDate: string
  }
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
  // Real cash on hand right now (see lib/cashBalance.ts). When provided, the
  // projection is grounded in it directly and withStartingCash() is not
  // needed afterward. When omitted, falls back to the last paycheck amount
  // (net of any same-day transfer) exactly as before -- a projection, not a
  // balance, and labeled that way in the UI.
  startingCash?: number
  // The date startingCash was accurate as of. Anything due on or before it is
  // already inside that balance and must not be subtracted again -- see
  // balanceAsOfISO in projectBalanceTimeline (lib/paycheckCycles.ts) for the
  // double-count this closes. Only meaningful alongside startingCash.
  startingCashAsOf?: string | null
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
    lowestDate: null,
    incomeThroughLowest: 0,
    outflowThroughLowest: 0,
    timeline: null,
    incomeInWindow: 0,
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
  // CRITICAL FIX (Sep 10 2026, Vince, live, furious): "There are three main
  // bills that come from this account: car, personal loan, and mortgage.
  // This must be removed from safe to spend when you look at the full
  // month." Traced this to the mortgage specifically: it's marked
  // paid_through this month already, so its NEXT unpaid payment (next
  // month, even after its grace period) fell past `windowEndDate` and
  // dropped out of the reservation entirely -- correct for "what's still
  // owed by month-end," but not what Vince wants for a recurring debt tied
  // to this account. extendForNextOccurrence (see itemsDueInWindow)
  // guarantees every debt always has its very next payment reserved, even
  // when that payment's own date falls in the following month.
  const debtsDue = sumDueInWindow(
    excludeTransferCoveredDebts(input.debts, input.income).map((d) => ({
      amount: d.minimum_payment,
      due_date: d.due_date,
      grace_period_days: d.grace_period_days,
      paid_through: d.paid_through,
    })),
    lastPaycheckDate,
    windowEndDate,
    { extendForNextOccurrence: true }
  )

  // The transfer tied to the paycheck that already landed (same day, same
  // schedule as lastPaycheckDate) -- money that's already gone by the time
  // this is being asked, whether or not the user's tracked a real balance.
  // Only ever subtracted from the lastPaycheck-projection fallback below;
  // a real account balance (withStartingCash) already reflects it, since
  // lastPaycheckDate is always in the past.
  const dayBeforeLastPaycheck = toISODate(addDays(new Date(lastPaycheckDate + "T00:00:00"), -1))
  const transfersOut = sumTransfersInWindow(input.income, dayBeforeLastPaycheck, lastPaycheckDate)

  const startingCash = input.startingCash ?? lastPaycheckAmount - transfersOut

  // CRITICAL FIX (Sep 10 2026, Vince, live screenshot showing -$21.84 on an
  // account with $3,353.13 in it): safeToSpend used to be
  // `startingCash - billsDue - debtsDue`, which measured a month-plus of
  // obligations against zero income even though the card itself said the
  // window ran 20 more days -- and two $1,660 paychecks land inside those 20
  // days. See projectBalanceTimeline in lib/paycheckCycles.ts for the whole
  // argument; the short version is that the honest answer to "what can I
  // spend today" is the LOWEST the balance ever gets between now and the
  // horizon, with income and obligations both on the calendar.
  const horizonISO = projectionHorizonISO(today)
  const timeline = projectBalanceTimeline({
    startingBalance: startingCash,
    fromISO: todayStr,
    toISO: horizonISO,
    // Anything already due since the last paycheck and still not marked paid
    // is real money that has to leave, so it lands immediately -- same
    // behavior the old lastPaycheckDate-anchored window had.
    pastDueFromISO: lastPaycheckDate,
    balanceAsOfISO: input.startingCash != null ? input.startingCashAsOf ?? null : null,
    income: input.income,
    bills: input.bills,
    debts: input.debts,
  })
  const safeToSpend = timeline.lowestBalance

  const incomeInWindow = timeline.events
    .filter((e) => e.kind === "income" && e.date <= windowEndDate)
    .reduce((sum, e) => sum + e.delta, 0)

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
    startingCashSource: input.startingCash != null ? "checking" : "lastPaycheck",
    startingCashAsOf: input.startingCash != null ? input.startingCashAsOf ?? null : null,
    lowestDate: timeline.lowestDate,
    incomeThroughLowest: timeline.incomeThroughLowest,
    outflowThroughLowest: timeline.outflowThroughLowest,
    timeline,
    incomeInWindow: Math.round(incomeInWindow * 100) / 100,
    _projection: {
      income: input.income,
      bills: input.bills,
      debts: input.debts,
      todayISO: todayStr,
      horizonISO,
      lastPaycheckDate,
    },
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
  cash: {
    amount: number
    source: SafeToSpendResult["startingCashSource"]
    asOf: string | null
    // The date `amount` is accurate as of -- see StartingCash.effectiveAsOf
    // in lib/cashBalance.ts. Falls back to `asOf` for callers handing in a
    // raw, un-projected balance, where the two are the same date.
    effectiveAsOf?: string | null
  }
): SafeToSpendResult {
  if (!result.hasIncome || result.missingPayDate || !result.nextPaycheckDate) {
    return result
  }
  // CRITICAL FIX (Sep 10 2026, Vince): this used to redo the same
  // income-blind `cash - billsDue - debtsDue` subtraction computeSafeToSpend
  // did, which made it the function that actually produced the wrong number
  // on screen (every page grounds the result in a real balance through here).
  // It now re-runs the same projection computeSafeToSpend runs, against the
  // real balance, so the two can never disagree.
  const proj = result._projection
  if (!proj) {
    // No projection inputs carried (a hand-built result in a test, say) --
    // fall back to the old subtraction rather than throwing.
    const safeToSpend = cash.amount - result.billsDue - result.debtsDue
    return {
      ...result,
      safeToSpend,
      dailyLimit:
        result.daysUntilWindowEnd != null && result.daysUntilWindowEnd > 0
          ? safeToSpend / result.daysUntilWindowEnd
          : safeToSpend,
      startingCash: cash.amount,
      startingCashSource: cash.source,
      startingCashAsOf: cash.asOf,
    }
  }

  const timeline = projectBalanceTimeline({
    startingBalance: cash.amount,
    fromISO: proj.todayISO,
    toISO: proj.horizonISO,
    pastDueFromISO: proj.lastPaycheckDate,
    // Only a real dated bank balance can settle anything -- a "lastPaycheck"
    // projection has no as-of date to reason from. See balanceAsOfISO in
    // projectBalanceTimeline.
    balanceAsOfISO: cash.source === "checking" ? cash.effectiveAsOf ?? cash.asOf : null,
    income: proj.income,
    bills: proj.bills,
    debts: proj.debts,
  })
  const safeToSpend = timeline.lowestBalance
  const dailyLimit =
    result.daysUntilWindowEnd != null && result.daysUntilWindowEnd > 0
      ? safeToSpend / result.daysUntilWindowEnd
      : safeToSpend
  const incomeInWindow = result.windowEndDate
    ? timeline.events
        .filter((e) => e.kind === "income" && e.date <= result.windowEndDate!)
        .reduce((sum, e) => sum + e.delta, 0)
    : 0
  return {
    ...result,
    safeToSpend,
    dailyLimit,
    startingCash: cash.amount,
    startingCashSource: cash.source,
    startingCashAsOf: cash.asOf,
    lowestDate: timeline.lowestDate,
    incomeThroughLowest: timeline.incomeThroughLowest,
    outflowThroughLowest: timeline.outflowThroughLowest,
    timeline,
    incomeInWindow: Math.round(incomeInWindow * 100) / 100,
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
