// lib/paycheckCycles.ts
// Shared paycheck-cycle projection engine. Single source of truth for "what
// does a given paycheck need to cover" -- lib/safeToSpend.ts (Dashboard /
// Survival Mode) projects the single next cycle from what the user already
// has; lib/planResilience.ts (Paycheck Shield) projects every upcoming
// cycle to ask which one is thinnest. Both build on these same primitives
// instead of maintaining their own copies, so the numbers can never quietly
// disagree with each other.

import { occurrencesInMonth, billOccurrenceInMonth, type Frequency } from "./schedule"

const MS_PER_DAY = 24 * 60 * 60 * 1000
const GOAL_SCAN_MONTHS_FORWARD = 24

export type CycleIncome = {
  amount: number
  frequency: string | null
  next_pay_date: string | null
  income_type?: string | null
}

export type CycleBill = {
  amount: number
  due_date: number | null
}

export type CycleDebt = {
  minimum_payment: number
  due_date: number | null
  // QA fix (Sep 3 2026, Vince): a debt paid automatically from a linked
  // transfer (e.g. a second bank the paycheck sweeps money to for a
  // mortgage/car loan) shouldn't ALSO be subtracted from this account's
  // Safe to Spend -- that money already left via the transfer (see
  // sumTransfersInWindow below), so counting the debt too would subtract it
  // twice. Debts with this set are excluded from every debtsDue calculation
  // in this file.
  covered_by_transfer?: boolean | null
}

export type CycleGoal = {
  target_amount: number
  current_amount: number | null
  deadline: string | null
  status: string | null
}

// One projected upcoming paycheck: what arrives, what's due in the window
// since the previous projected paycheck (or since "today" for the first
// cycle), and what's left over.
export type PaycheckCycle = {
  date: string
  windowStart: string
  amount: number
  billsDue: number
  debtsDue: number
  goalContribution: number
  // Money swept out to another of the user's own accounts on this same
  // date (see sumTransfersInWindow) -- already netted out of `amount`
  // above, broken out here so the UI can show it as its own line instead of
  // folding it silently into a smaller paycheck.
  transfersOut: number
  // This cycle's own paycheck vs its own bills/debts/goal, in isolation --
  // "does this specific paycheck cover what's due in its own window."
  // Useful for per-paycheck presentation (Paycheck Capacity's %, "If This
  // Paycheck Could Talk"), but NOT a real risk signal on its own: a cycle
  // can show a negative cushion here and still be perfectly fine in
  // practice if there's real money sitting in checking already covering
  // it. See runningBalance below for that.
  cushion: number
  // Real cumulative cash position at the end of this cycle's window: the
  // starting cash actually on hand (see lib/cashBalance.ts -- 0 when none
  // entered) plus every cycle's cushion up through and including this one.
  // This is what should actually decide "is my plan in trouble," since it
  // carries forward real money instead of pretending every cycle starts
  // from zero.
  runningBalance: number
}

// A debt not paid from this account's own money -- see CycleDebt's
// covered_by_transfer comment. Filters (rather than a combined
// "sum debts due, excluding transfers" helper) so every call site can keep
// mapping its own row shape into { amount, due_date } afterward.
export function excludeTransferCoveredDebts<T extends { covered_by_transfer?: boolean | null }>(debts: T[]): T[] {
  return debts.filter((d) => !d.covered_by_transfer)
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY)
}

export function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + "T00:00:00")
  const to = new Date(toISO + "T00:00:00")
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY)
}

// Every income occurrence (date + amount) across the given month range,
// income_type "transfer" excluded -- transfers are money moving between the
// user's own accounts, not real income.
export function projectIncomeOccurrences(
  income: CycleIncome[],
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
      const dates = occurrencesInMonth(inc.next_pay_date!, (inc.frequency || "monthly") as Frequency, year, month)
      for (const date of dates) {
        out.push({ date, amount: Number(inc.amount) || 0 })
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

// Every "transfer" income-row occurrence (date + amount) across the given
// month range -- the mirror image of projectIncomeOccurrences above. Real
// income projection excludes these because they're not new money; Safe to
// Spend needs the opposite: they're a real, scheduled cash outflow (an
// automatic sweep to another of the user's own accounts, e.g. one that
// covers a mortgage/car loan there) that happens on the same schedule as a
// paycheck, whether or not anything else is "due" yet.
export function projectTransferOccurrences(
  income: CycleIncome[],
  startYear: number,
  startMonth: number,
  monthCount: number
): { date: string; amount: number }[] {
  const out: { date: string; amount: number }[] = []
  const transfers = income.filter((i) => i.income_type === "transfer" && i.next_pay_date)
  for (let step = 0; step < monthCount; step++) {
    const idx = startYear * 12 + startMonth + step
    const year = Math.floor(idx / 12)
    const month = idx % 12
    for (const inc of transfers) {
      const dates = occurrencesInMonth(inc.next_pay_date!, (inc.frequency || "monthly") as Frequency, year, month)
      for (const date of dates) {
        out.push({ date, amount: Number(inc.amount) || 0 })
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

// Sum of transfer occurrences in (fromISO, toISO] -- same half-open window
// convention as sumDueInWindow, so "the transfer tied to this paycheck" can
// be found the same way a bill/debt due date is.
export function sumTransfersInWindow(income: CycleIncome[], fromISO: string, toISO: string): number {
  const from = new Date(fromISO + "T00:00:00")
  const to = new Date(toISO + "T00:00:00")
  const monthCount = to.getFullYear() * 12 + to.getMonth() - (from.getFullYear() * 12 + from.getMonth()) + 1
  const occurrences = projectTransferOccurrences(income, from.getFullYear(), from.getMonth(), monthCount)
  return occurrences.filter((o) => o.date > fromISO && o.date <= toISO).reduce((sum, o) => sum + o.amount, 0)
}

// Sum of real (non-transfer) income occurrences in (fromISO, toISO] -- the
// counterpart to sumTransfersInWindow, used by projectRunningBalance below
// to add back paychecks that landed since a manually-entered balance.
export function sumIncomeInWindow(income: CycleIncome[], fromISO: string, toISO: string): number {
  const from = new Date(fromISO + "T00:00:00")
  const to = new Date(toISO + "T00:00:00")
  const monthCount = to.getFullYear() * 12 + to.getMonth() - (from.getFullYear() * 12 + from.getMonth()) + 1
  const occurrences = projectIncomeOccurrences(income, from.getFullYear(), from.getMonth(), monthCount)
  return occurrences.filter((o) => o.date > fromISO && o.date <= toISO).reduce((sum, o) => sum + o.amount, 0)
}

// Projects a manually-entered account balance forward from the date it was
// accurate (anchorDateISO) to today (asOfISO), using only real scheduled
// cash movements: paychecks landing (add), automatic transfers out (see
// projectTransferOccurrences), and bills/debts due (subtract) -- NOT goal
// contributions, which are a planning target, not money that has actually
// left the account. This is the "no Plaid Auth needed" alternative to a
// live bank balance: the user only has to enter their real balance once,
// and it stays accurate on its own for as long as their income/bills/debts
// stay accurate, instead of quietly going stale the moment they stop
// re-checking their bank.
export function projectRunningBalance(input: {
  anchorBalance: number
  anchorDateISO: string
  asOfISO: string
  income: CycleIncome[]
  bills: CycleBill[]
  debts: CycleDebt[]
}): number {
  const { anchorBalance, anchorDateISO, asOfISO, income, bills, debts } = input
  if (asOfISO <= anchorDateISO) return anchorBalance
  const incomeIn = sumIncomeInWindow(income, anchorDateISO, asOfISO)
  const transfersOut = sumTransfersInWindow(income, anchorDateISO, asOfISO)
  const billsOut = sumDueInWindow(bills, anchorDateISO, asOfISO)
  const debtsOut = sumDueInWindow(
    excludeTransferCoveredDebts(debts).map((d) => ({ amount: d.minimum_payment, due_date: d.due_date })),
    anchorDateISO,
    asOfISO
  )
  return Math.round((anchorBalance + incomeIn - transfersOut - billsOut - debtsOut) * 100) / 100
}

// Every bill/debt occurrence whose due date falls in (fromISO, toISO],
// tagged with the resolved occurrence date -- used both to sum a window's
// commitments and (by Paycheck Shield) to name which specific items landed
// in a thin cycle.
export function itemsDueInWindow<T extends { amount: number; due_date: number | null }>(
  rows: T[],
  fromISO: string,
  toISO: string
): (T & { occurrenceDate: string })[] {
  const from = new Date(fromISO + "T00:00:00")
  const to = new Date(toISO + "T00:00:00")
  const startIdx = from.getFullYear() * 12 + from.getMonth()
  const endIdx = to.getFullYear() * 12 + to.getMonth()
  const out: (T & { occurrenceDate: string })[] = []
  for (const row of rows) {
    if (!row.due_date) continue
    for (let idx = startIdx; idx <= endIdx; idx++) {
      const year = Math.floor(idx / 12)
      const month = idx % 12
      const date = billOccurrenceInMonth(row.due_date, year, month)
      if (date > fromISO && date <= toISO) {
        out.push({ ...row, occurrenceDate: date })
      }
    }
  }
  return out
}

export type ItemStatus = "alreadyDue" | "upcoming"
export type ClassifiedItem<T> = T & { occurrenceDate: string; itemStatus: ItemStatus }

// Splits bills/debts into "already due earlier this cycle" (this month's
// occurrence falls on or before today, so it's assumed already paid out of
// a previous paycheck) vs "due before your next paycheck" (still to come,
// and what Safe-to-Spend's billsDue/debtsDue actually subtracts). Built so
// a big bill like a mortgage that quietly drops out of the subtraction --
// because its due day already passed this month -- doesn't just vanish
// with no explanation; the UI can show both lists instead of just a total.
export function classifyItemsAroundCycle<T extends { amount: number; due_date: number | null }>(
  rows: T[],
  todayISO: string,
  nextPaycheckISO: string
): ClassifiedItem<T>[] {
  const today = new Date(todayISO + "T00:00:00")
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const scanFromISO = toISODate(addDays(monthStart, -1))
  const items = itemsDueInWindow(rows, scanFromISO, nextPaycheckISO)
  return items.map((it) => ({
    ...it,
    itemStatus: (it.occurrenceDate <= todayISO ? "alreadyDue" : "upcoming") as ItemStatus,
  }))
}

export function sumDueInWindow(
  rows: { amount: number; due_date: number | null }[],
  fromISO: string,
  toISO: string
): number {
  return itemsDueInWindow(rows, fromISO, toISO).reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
}

// Required contribution toward each active goal, expressed as a per-paycheck
// rate as of `asOfISO` -- remaining amount divided across the real paycheck
// occurrences (via `income`) between asOfISO and the goal's deadline, capped
// at GOAL_SCAN_MONTHS_FORWARD months out. Goals with no deadline, already
// funded, not active, or too far out don't factor in. An overdue deadline
// counts its full remaining amount (needed now, not spread across paychecks
// that no longer exist).
export function goalContributionRate(goals: CycleGoal[], income: CycleIncome[], asOfISO: string): number {
  const asOf = new Date(asOfISO + "T00:00:00")
  const asOfYear = asOf.getFullYear()
  const asOfMonth = asOf.getMonth()
  let total = 0
  for (const g of goals) {
    if (g.status && g.status !== "active") continue
    if (!g.deadline) continue
    const remaining = Number(g.target_amount || 0) - Number(g.current_amount ?? 0)
    if (remaining <= 0) continue
    if (g.deadline <= asOfISO) {
      total += remaining
      continue
    }
    const idx = asOfYear * 12 + asOfMonth
    const deadlineDate = new Date(g.deadline + "T00:00:00")
    const deadlineIdx = deadlineDate.getFullYear() * 12 + deadlineDate.getMonth()
    const monthsOut = deadlineIdx - idx
    if (monthsOut > GOAL_SCAN_MONTHS_FORWARD) continue

    const occurrences = projectIncomeOccurrences(income, asOfYear, asOfMonth, monthsOut + 1)
    const uniqueDates = Array.from(new Set(occurrences.map((o) => o.date))).filter(
      (d) => d > asOfISO && d <= g.deadline!
    )
    const paychecksRemaining = Math.max(1, uniqueDates.length)
    total += remaining / paychecksRemaining
  }
  return total
}

// Per-goal contributions across a whole set of projected cycle dates (used
// by projectPaycheckCycles below). NOT the same as calling
// goalContributionRate() once per date: that function's rate is meant to be
// evaluated from a single anchor point (safe for lib/safeToSpend.ts, which
// only ever asks "as of today"), but naively re-evaluating it fresh at each
// of many future cycle dates makes the rate re-shrink toward the full
// remaining amount as each cycle gets closer to the deadline -- summing
// those independently-computed rates ends up charging the same goal several
// times over. Here the rate is computed ONCE from `anchorISO` (today), then
// applied flat to every visible cycle before the deadline, so the total
// charged across this projection can never exceed the goal's actual
// remaining amount.
export function goalContributionsForCycles(
  goals: CycleGoal[],
  income: CycleIncome[],
  cycleDates: string[],
  anchorISO: string
): Map<string, number> {
  const contributions = new Map<string, number>(cycleDates.map((d) => [d, 0]))
  if (cycleDates.length === 0) return contributions

  for (const g of goals) {
    if (g.status && g.status !== "active") continue
    if (!g.deadline) continue
    const remaining = Number(g.target_amount || 0) - Number(g.current_amount ?? 0)
    if (remaining <= 0) continue

    if (g.deadline <= anchorISO) {
      // Already overdue as of today -- the whole remaining amount is
      // needed now, landing on the very next projected paycheck (once,
      // not repeated on every cycle after it).
      const target = cycleDates[0]
      contributions.set(target, (contributions.get(target) || 0) + remaining)
      continue
    }

    const anchor = new Date(anchorISO + "T00:00:00")
    const deadlineDate = new Date(g.deadline + "T00:00:00")
    const monthsOut =
      deadlineDate.getFullYear() * 12 + deadlineDate.getMonth() - (anchor.getFullYear() * 12 + anchor.getMonth())
    if (monthsOut > GOAL_SCAN_MONTHS_FORWARD) continue

    // True total paycheck count between today and the deadline, from the
    // full income schedule -- not bounded by how many cycles this
    // projection happens to be showing, so a goal with a longer runway
    // than the projection window still gets a realistic (smaller)
    // per-paycheck rate instead of being squeezed into just the visible
    // cycles.
    const occurrences = projectIncomeOccurrences(income, anchor.getFullYear(), anchor.getMonth(), monthsOut + 1)
    const uniqueDates = Array.from(new Set(occurrences.map((o) => o.date))).filter(
      (d) => d > anchorISO && d <= g.deadline!
    )
    const totalPaychecks = Math.max(1, uniqueDates.length)
    const perPaycheck = remaining / totalPaychecks

    // Apply that flat rate to whichever of those paychecks are actually
    // visible in this projection.
    for (const d of cycleDates) {
      if (d < g.deadline!) {
        contributions.set(d, (contributions.get(d) || 0) + perPaycheck)
      }
    }
  }
  return contributions
}

// Projects every upcoming paycheck date over the next `monthsForward` months
// and, for each one, what it needs to cover: bills/debts due since the
// *previous* projected paycheck (or since `today` for the first one, if no
// past paycheck is found), plus each active goal's per-paycheck rate as of
// that date. `cushion` is what's left over -- the same "does this paycheck
// have enough" question Safe-to-Spend asks about the very next paycheck,
// generalized across all of them so Paycheck Shield can ask which future
// paycheck is weakest. Multiple income rows landing on the same calendar
// date are summed into one cycle for that date.
export function projectPaycheckCycles(input: {
  income: CycleIncome[]
  bills: CycleBill[]
  debts: CycleDebt[]
  goals: CycleGoal[]
  today?: Date
  monthsForward?: number
  // Real cash on hand right now (pooled/projected Checking balance -- see
  // lib/cashBalance.ts), used to seed runningBalance. Defaults to 0, which
  // reproduces the old "assume nothing carried in" behavior for callers
  // that don't have a real balance to ground with (or don't care to).
  startingCash?: number
}): PaycheckCycle[] {
  const today = input.today ?? new Date()
  const todayStr = toISODate(today)
  const monthsForward = input.monthsForward ?? 3
  const hasIncome = input.income.length > 0
  const missingPayDate = !hasIncome || input.income.every((i) => !i.next_pay_date)
  if (missingPayDate) return []

  // Scan back 2 months for the most recent past paycheck (to anchor the
  // first projected cycle's window), forward enough to comfortably cover
  // the requested horizon regardless of where "today" falls in the month.
  const scanStartIdx = today.getFullYear() * 12 + today.getMonth() - 2
  const scanStartYear = Math.floor(scanStartIdx / 12)
  const scanStartMonth = ((scanStartIdx % 12) + 12) % 12
  const occurrences = projectIncomeOccurrences(input.income, scanStartYear, scanStartMonth, monthsForward + 3)

  const past = occurrences.filter((o) => o.date <= todayStr)
  const future = occurrences.filter((o) => o.date > todayStr)
  if (future.length === 0) return []

  const horizonEnd = new Date(today.getFullYear(), today.getMonth() + monthsForward, today.getDate())
  const horizonEndStr = toISODate(horizonEnd)

  // Dedup future dates (multiple income rows can land on the same day) and
  // sum same-day amounts into one cycle per real paycheck-arrival date.
  const byDate = new Map<string, number>()
  for (const o of future) {
    if (o.date > horizonEndStr) continue
    byDate.set(o.date, (byDate.get(o.date) || 0) + o.amount)
  }
  const dates = Array.from(byDate.keys()).sort()

  // Net each cycle's paycheck against any transfer landing on that same
  // date (see sumTransfersInWindow) -- a transfer scheduled alongside the
  // paycheck (same next_pay_date/frequency, e.g. an automatic sweep to
  // another bank) leaves before it's ever "safe to spend," so it comes out
  // of `amount` here rather than only being excluded from income.
  const transferOccurrences = projectTransferOccurrences(input.income, scanStartYear, scanStartMonth, monthsForward + 3)
  const transfersByDate = new Map<string, number>()
  for (const t of transferOccurrences) {
    transfersByDate.set(t.date, (transfersByDate.get(t.date) || 0) + t.amount)
  }

  const spendableDebts = excludeTransferCoveredDebts(input.debts)

  // Goal contributions are resolved across the whole set of cycle dates at
  // once (see goalContributionsForCycles) rather than per-cycle in this
  // loop -- an overdue goal's full remaining amount needs to land on
  // exactly one cycle, not get re-charged on every cycle after it.
  const goalContributions = goalContributionsForCycles(input.goals, input.income, dates, todayStr)

  const cycles: PaycheckCycle[] = []
  let windowStart = past.length > 0 ? past[past.length - 1].date : todayStr
  let runningBalance = input.startingCash ?? 0
  for (const date of dates) {
    const billsDue = sumDueInWindow(input.bills, windowStart, date)
    const debtsDue = sumDueInWindow(
      spendableDebts.map((d) => ({ amount: d.minimum_payment, due_date: d.due_date })),
      windowStart,
      date
    )
    const goalContribution = goalContributions.get(date) || 0
    const transfersOut = transfersByDate.get(date) || 0
    const amount = (byDate.get(date) || 0) - transfersOut
    const cushion = amount - billsDue - debtsDue - goalContribution
    runningBalance = Math.round((runningBalance + cushion) * 100) / 100
    cycles.push({
      date,
      windowStart,
      amount,
      billsDue,
      debtsDue,
      goalContribution,
      transfersOut,
      cushion,
      runningBalance,
    })
    windowStart = date
  }
  return cycles
}
