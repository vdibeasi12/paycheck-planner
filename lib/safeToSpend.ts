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

import { occurrencesInMonth, billOccurrenceInMonth, type Frequency } from "./schedule"

const MS_PER_DAY = 24 * 60 * 60 * 1000
// How far past/forward we're willing to scan looking for a paycheck date.
// 3 months comfortably covers even quarterly/annual income entries; goal
// paycheck-counting below uses its own, longer horizon.
const SCAN_MONTHS_BACK = 2
const SCAN_MONTHS_FORWARD = 3
// Very-long-horizon goals (deadline further out than this) are excluded from
// the per-cycle contribution rather than walking hundreds of months of
// occurrences -- they're not what "safe to spend until payday" is about.
const GOAL_SCAN_MONTHS_FORWARD = 24

export type STSIncome = {
  amount: number
  frequency: string | null
  next_pay_date: string | null
  income_type?: string | null
}

export type STSBill = {
  amount: number
  due_date: number | null
}

export type STSDebt = {
  minimum_payment: number
  due_date: number | null
}

export type STSGoal = {
  target_amount: number
  current_amount: number | null
  deadline: string | null
  status: string | null
}

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
}

export type WhatIfVerdict = "fine" | "tight" | "not-recommended"

export type WhatIfResult = {
  newSafeToSpend: number
  verdict: WhatIfVerdict
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY)
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + "T00:00:00")
  const to = new Date(toISO + "T00:00:00")
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY)
}

// Every income occurrence (date + amount) across the given month range,
// income_type "transfer" excluded -- same convention as the Dashboard's
// existing monthly total (transfers are money moving between the user's own
// accounts, not real income).
function projectIncomeOccurrences(
  income: STSIncome[],
  startYear: number,
  startMonth: number,
  monthCount: number
): { date: string; amount: number }[] {
  const out: { date: string; amount: number }[] = []
  const real = income.filter((i) => i.income_type !== "transfer" && i.next_pay_date)
  for (let step = 0; step < monthCount; step++) {
    const idx = startYear * 12 + startMonth + step
    const year = Math.floor(idx / 12)
    const month = idx % 12
    for (const inc of real) {
      const dates = occurrencesInMonth(inc.next_pay_date, (inc.frequency || "monthly") as Frequency, year, month)
      for (const date of dates) {
        out.push({ date, amount: Number(inc.amount) || 0 })
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

// Sum of bill/debt occurrences whose due date falls in (fromISO, toISO] --
// i.e. still ahead of "today", up to and including the next paycheck date.
function sumDueInWindow(
  rows: { amount: number; due_date: number | null }[],
  fromISO: string,
  toISO: string
): number {
  const from = new Date(fromISO + "T00:00:00")
  const to = new Date(toISO + "T00:00:00")
  let total = 0
  const startIdx = from.getFullYear() * 12 + from.getMonth()
  const endIdx = to.getFullYear() * 12 + to.getMonth()
  for (const row of rows) {
    if (!row.due_date) continue
    for (let idx = startIdx; idx <= endIdx; idx++) {
      const year = Math.floor(idx / 12)
      const month = idx % 12
      const date = billOccurrenceInMonth(row.due_date, year, month)
      if (date > fromISO && date <= toISO) {
        total += Number(row.amount) || 0
      }
    }
  }
  return total
}

// Required per-paycheck contribution to hit each goal's deadline, summed.
// Derived rather than stored -- financial_goals has no explicit "per
// paycheck" field, so this counts real upcoming paycheck dates (via the same
// income schedule as everything else) between today and each goal's
// deadline and divides the remaining amount across them. Goals with no
// deadline, already funded, not active, or with a deadline further out than
// GOAL_SCAN_MONTHS_FORWARD don't factor into "safe to spend right now."
function computeGoalContribution(
  goals: STSGoal[],
  income: STSIncome[],
  todayISOStr: string,
  todayYear: number,
  todayMonth: number
): number {
  let total = 0
  for (const g of goals) {
    if (g.status && g.status !== "active") continue
    if (!g.deadline) continue
    const remaining = Number(g.target_amount || 0) - Number(g.current_amount ?? 0)
    if (remaining <= 0) continue
    if (g.deadline <= todayISOStr) {
      // Overdue/imminent goal -- the whole remaining amount is "needed now"
      // rather than divided across paychecks that no longer exist.
      total += remaining
      continue
    }
    const idx = todayYear * 12 + todayMonth
    const deadlineDate = new Date(g.deadline + "T00:00:00")
    const deadlineIdx = deadlineDate.getFullYear() * 12 + deadlineDate.getMonth()
    const monthsOut = deadlineIdx - idx
    if (monthsOut > GOAL_SCAN_MONTHS_FORWARD) continue

    const occurrences = projectIncomeOccurrences(income, todayYear, todayMonth, monthsOut + 1)
    const uniqueDates = Array.from(new Set(occurrences.map((o) => o.date))).filter(
      (d) => d > todayISOStr && d <= g.deadline!
    )
    const paychecksRemaining = Math.max(1, uniqueDates.length)
    total += remaining / paychecksRemaining
  }
  return total
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
  const goalContribution = computeGoalContribution(
    input.goals,
    input.income,
    todayStr,
    today.getFullYear(),
    today.getMonth()
  )

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
  }
}

// "Can I afford this?" -- purely a hypothetical against the current
// Safe-to-Spend number, no state changes. Verdict thresholds: still >= 20%
// of the original safe-to-spend left over is "fine"; still non-negative but
// under that cushion is "tight"; below zero is "not recommended."
export function whatIfSpend(result: SafeToSpendResult, amount: number): WhatIfResult {
  const newSafeToSpend = result.safeToSpend - amount
  const cushion = result.safeToSpend * 0.2
  let verdict: WhatIfVerdict = "fine"
  if (newSafeToSpend < 0) verdict = "not-recommended"
  else if (newSafeToSpend < cushion) verdict = "tight"
  return { newSafeToSpend, verdict }
}
