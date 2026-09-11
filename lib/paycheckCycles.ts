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
  // QA fix (Sep 4 2026, Vince): "add [to the account] when a paycheck will
  // be sent... checking plus savings should auto adjust" -- which account
  // this paycheck (or, for an income_type "transfer" row, this sweep)
  // actually deposits into. See lib/cashBalance.ts's projectAccountBalance,
  // which is the only place this is read. Unset means "not linked to a
  // specific account yet" -- it still counts toward the POOLED Safe-to-
  // Spend total (resolveStartingCash doesn't filter by this), it just
  // doesn't move any single account's own projected balance until assigned.
  cash_account_id?: string | null
}

export type CycleBill = {
  amount: number
  due_date: number | null
  // QA fix (Sep 4 2026, Vince): "I paid the mortgage today from 53rd, this
  // should change my amount" -- there's no live bank feed (no Plaid Auth),
  // so the app can't tell on its own that a scheduled bill/debt actually got
  // paid; without a way to say so, this month's occurrence just sits in the
  // due-window math until its date passes on its own, and the account
  // balance the user typed in stays frozen ("static") no matter what they
  // actually pay. paid_through is the workaround: the nominal due date
  // (see billOccurrenceInMonth) of the most recent occurrence the user has
  // confirmed paying, set by the "Mark as paid" action in Bills & Debts
  // (app/bills-debts/page.tsx), which also debits the chosen cash account
  // right then instead of waiting for the due date to roll around. Compared
  // against the NOMINAL date, not the grace-adjusted one -- paying early
  // (within a grace window) still settles that cycle. See itemsDueInWindow.
  paid_through?: string | null
  // QA fix (Sep 4 2026, Vince): found while tracing a live $897.03
  // "Still Due Before Payday" figure -- billOccurrenceInMonth (see
  // lib/schedule.ts) "always recur[s] monthly today," so a bill's own
  // `frequency` column was being read everywhere EXCEPT here, and a
  // bimonthly bill (e.g. a water bill only actually billed every other
  // month) was silently treated as due in every single month instead of
  // every other one. There's no anchor date on a bill (only a day-of-month),
  // so knowing WHICH of the two months a bimonthly bill lands on needs one
  // more bit of information from the user: bimonthly_parity, 'odd' (Jan,
  // Mar, May, Jul, Sep, Nov) or 'even' (Feb, Apr, Jun, Aug, Oct, Dec), set
  // in Bills & Debts when frequency is bimonthly. When frequency is
  // 'bimonthly' but parity hasn't been set (older rows created before this
  // fix), itemsDueInWindow deliberately falls back to the old
  // every-month behavior rather than guessing or silently excluding a
  // real bill -- see itemsDueInWindow below and
  // lib/__tests__/safeToSpend.test.ts (Test 14/15).
  frequency?: string | null
  bimonthly_parity?: "odd" | "even" | null
  // QA fix (Sep 4 2026, Vince): "have the credit cards and debt use
  // transaction which will minus the amount in checking" -- which account
  // this bill is actually paid from. See CycleIncome.cash_account_id above
  // (same idea, opposite direction) and lib/cashBalance.ts's
  // projectAccountBalance, the only place this is read.
  cash_account_id?: string | null
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
  //
  // CRITICAL CONSTRAINT (root-caused Sep 4 2026 after a real bug: Safe to
  // Spend showed $3,377.77 with a required debt payment -- Capital One Auto,
  // $596.50 -- silently missing from the reservation): this flag alone is
  // NOT trusted anymore. The live bug had covered_by_transfer set true on
  // Capital One Auto and Avant with ZERO transfer income rows on file to
  // back it up -- nothing had actually left anywhere. excludeTransferCoveredDebts
  // below now requires real corroborating evidence (at least one income row
  // with income_type "transfer") before it will honor this flag at all; a
  // debt flagged covered_by_transfer with no matching transfer on record is
  // reserved like any normal debt instead of silently vanishing. This closes
  // the exact failure mode, but is still a coarse, user-attested signal, not
  // a real link to a specific transfer -- there's no field yet tying THIS
  // debt to a SPECIFIC transfer row, so it can't yet also catch the mirror
  // case (a transfer whose destination is itself one of the user's OTHER
  // pooled Checking accounts, meaning the money never left the pool at all).
  // See lib/__tests__/safeToSpend.test.ts (Test 11) for the exact regression
  // this caused, and Test 16 for the "no evidence on file" guard.
  covered_by_transfer?: boolean | null
  // QA fix (Sep 4 2026, Vince): "my mortgage's due date is the 1st but I have
  // a grace period till the 16th without a penalty -- I paid on the 9th."
  // covered_by_transfer (above) means "already left automatically, exclude
  // entirely" -- a debt he pays himself, whenever he chooses within a grace
  // window, is a different thing and was being mis-modeled as one or the
  // other of those two extremes. This shifts the *effective* due date used
  // for window/"already due" purposes to due_date + grace_period_days (see
  // itemsDueInWindow below) instead of changing whether it counts at all --
  // conservative for Safe to Spend (assumes the money leaves at the latest
  // point the grace period allows) and stops a debt with a real grace period
  // from reading as "Overdue" the moment its nominal due day passes.
  grace_period_days?: number | null
  // See CycleBill.paid_through above -- same mechanism, same field, for
  // debts. Set by "Mark as paid" in Bills & Debts.
  paid_through?: string | null
  // See CycleBill.cash_account_id above -- same idea, same field, for debts.
  cash_account_id?: string | null
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

// Whether there's any real evidence a transfer actually exists for this
// user at all -- see CycleDebt.covered_by_transfer's "CRITICAL CONSTRAINT"
// comment. Deliberately coarse (any transfer row counts, not "the specific
// transfer this debt claims to rely on") since nothing in the schema yet
// links a debt to one particular transfer -- but coarse-and-checked beats
// nothing-checked-at-all, which is what let the $3,377.77 bug happen: two
// debts were flagged covered_by_transfer with zero transfer income rows on
// file anywhere.
function hasTransferEvidence(income: CycleIncome[]): boolean {
  return income.some((i) => i.income_type === "transfer")
}

// A debt not paid from this account's own money -- see CycleDebt's
// covered_by_transfer comment. Only honors that flag when a real transfer
// is actually on record (hasTransferEvidence above); otherwise the flag is
// ignored and the debt's payment is reserved like any other one. Filters
// (rather than a combined "sum debts due, excluding transfers" helper) so
// every call site can keep mapping its own row shape into
// { amount, due_date } afterward.
export function excludeTransferCoveredDebts<T extends { covered_by_transfer?: boolean | null }>(
  debts: T[],
  income: CycleIncome[]
): T[] {
  const hasEvidence = hasTransferEvidence(income)
  return debts.filter((d) => !(d.covered_by_transfer && hasEvidence))
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// CRITICAL FIX (Sep 11 2026, audit): this added `days * 86400000` ms, which
// is not a day across a DST change. Confirmed in America/New_York:
// addDays("2026-11-01", 1) returned 2026-11-01 -- adding a day moved nothing
// -- and addDays("2026-03-09", -1) returned 2026-03-07, skipping two. That
// silently shifted every grace-period effective date (see itemsDueInWindow)
// and the projection horizon around the clock changes. Calendar arithmetic
// keeps the same local wall-clock time and cannot drift.
export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)
}

// Last calendar day of `d`'s month, as an ISO date -- e.g. Sep 9 -> "2026-09-30".
//
// CRITICAL FIX (Sep 9 2026, Vince): "If I receive two paychecks a month you
// need to subtract all bills for that month which will determine safe to
// spend." lib/safeToSpend.ts used to only reserve what's due before the very
// NEXT paycheck -- a personal loan or any other bill landing later in the
// same month, after that next paycheck, fell outside the window entirely and
// wasn't reserved from today's real cash at all. Widening the window to run
// through the end of the current calendar month (regardless of how many
// paychecks land before then) means every bill/debt due this month is always
// accounted for from day one, which is what "earmarking" a later-month
// payment actually requires -- see lib/safeToSpend.ts's computeSafeToSpend.
export function endOfMonthISO(d: Date): string {
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return toISODate(lastDay)
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
    excludeTransferCoveredDebts(debts, income).map((d) => ({
      amount: d.minimum_payment,
      due_date: d.due_date,
      grace_period_days: d.grace_period_days,
      paid_through: d.paid_through,
    })),
    anchorDateISO,
    asOfISO
  )
  return Math.round((anchorBalance + incomeIn - transfersOut - billsOut - debtsOut) * 100) / 100
}

// Every bill/debt occurrence whose *effective* due date falls in
// (fromISO, toISO], tagged with that resolved occurrence date -- used both to
// sum a window's commitments and (by Paycheck Shield) to name which specific
// items landed in a thin cycle.
//
// QA fix (Sep 4 2026, Vince): a row's grace_period_days (debts only -- see
// CycleDebt) shifts its effective date forward from the raw due day, so a
// mortgage due the 1st with a 15-day grace period isn't treated as due (or as
// "already due, assumed paid") until the 16th. This is deliberately the
// LATEST point the grace window allows, not the day the user might actually
// pay -- Safe to Spend has no way to know the exact day, and assuming the
// money leaves as late as possible is the conservative direction to be wrong
// in (never overstates what's safe to spend).
//
// QA fix (Sep 4 2026, Vince, same day): a row's paid_through (see
// CycleBill/CycleDebt) skips a specific month's occurrence entirely once the
// user has confirmed paying it via "Mark as paid" -- checked against the
// NOMINAL due date (before any grace shift), since paying early inside a
// grace window still settles that cycle. Without this, a payment made ahead
// of the due date would get manually deducted from the account balance right
// away (see lib/cashBalance.ts) and then get projected/subtracted AGAIN once
// the projection catches up to the due date -- the exact double-count shape
// this file exists to prevent everywhere else.
// A bimonthly bill only lands in every OTHER month -- 'odd' means Jan/Mar/
// May/Jul/Sep/Nov, 'even' means Feb/Apr/Jun/Aug/Oct/Dec. `month` is
// 0-indexed (JS Date convention), so add 1 before checking its parity.
function matchesBimonthlyParity(month0: number, parity: "odd" | "even"): boolean {
  const isOddMonth = (month0 + 1) % 2 === 1
  return parity === "odd" ? isOddMonth : !isOddMonth
}

// How far past `toISO` to keep looking for a row's very next occurrence when
// `extendForNextOccurrence` is set and nothing turned up inside the window
// itself -- comfortably covers a mortgage-style debt with a long grace
// period or a paid_through set several cycles ahead.
const EXTEND_SCAN_MONTHS = 12

export function itemsDueInWindow<
  T extends {
    amount: number
    due_date: number | null
    grace_period_days?: number | null
    paid_through?: string | null
    frequency?: string | null
    bimonthly_parity?: "odd" | "even" | null
  }
>(
  rows: T[],
  fromISO: string,
  toISO: string,
  opts?: {
    // CRITICAL FIX (Sep 10 2026, Vince, live: "there are three main bills
    // that come from this account: car, personal loan, and mortgage. This
    // must be removed from safe to spend when you look at the full month"):
    // a debt whose only unpaid occurrence lands AFTER `toISO` (a mortgage
    // already marked paid_through this month, so its next payment doesn't
    // come due until next month even after its grace period) used to drop
    // out of the window's total entirely -- correct for "what's due by
    // month-end," but Vince wants every recurring debt tied to an account to
    // always have its very next payment reserved, not just the ones that
    // happen to land before this exact date. When true, a row that produced
    // ZERO occurrences inside (fromISO, toISO] gets exactly one -- its next
    // occurrence past toISO -- so it's never simply absent from the total.
    // Bills are deliberately left out of this (opt-in per call, not global)
    // -- Vince named debts specifically, and a small monthly utility bill
    // reserving a cycle early isn't the problem he's describing.
    extendForNextOccurrence?: boolean
  }
): (T & { occurrenceDate: string })[] {
  const from = new Date(fromISO + "T00:00:00")
  const to = new Date(toISO + "T00:00:00")
  const startIdx = from.getFullYear() * 12 + from.getMonth()
  const endIdx = to.getFullYear() * 12 + to.getMonth()
  const out: (T & { occurrenceDate: string })[] = []
  for (const row of rows) {
    if (!row.due_date) continue
    let foundInWindow = false
    // Only true when this window actually LOST an occurrence to paid_through
    // (it would otherwise have landed inside (fromISO, toISO]) -- NOT true
    // for a row whose occurrence simply falls at/before fromISO on its own
    // (that's the ordinary "already the prior cycle's obligation" case, see
    // Test 7 in safeToSpend.test.ts, and must never trigger the extension
    // below -- doing so was a real bug caught while building this: a debt
    // due exactly ON the last paycheck date was wrongly getting an EXTRA
    // reservation for next month on top of nothing being due this one).
    let lostToPaidThrough = false
    for (let idx = startIdx; idx <= endIdx; idx++) {
      const year = Math.floor(idx / 12)
      const month = idx % 12
      // See CycleBill.bimonthly_parity -- only skip the "off" months once
      // the user has actually told us which parity this bill is on; an
      // unset parity keeps the old (safe, if imprecise) every-month behavior.
      if (row.frequency === "bimonthly" && row.bimonthly_parity && !matchesBimonthlyParity(month, row.bimonthly_parity)) {
        continue
      }
      const nominalDate = billOccurrenceInMonth(row.due_date, year, month)
      const wouldBeDate = row.grace_period_days
        ? toISODate(addDays(new Date(nominalDate + "T00:00:00"), row.grace_period_days))
        : nominalDate
      if (row.paid_through && nominalDate <= row.paid_through) {
        if (wouldBeDate > fromISO && wouldBeDate <= toISO) lostToPaidThrough = true
        continue
      }
      if (wouldBeDate > fromISO && wouldBeDate <= toISO) {
        out.push({ ...row, occurrenceDate: wouldBeDate })
        foundInWindow = true
      }
    }
    if (!foundInWindow && lostToPaidThrough && opts?.extendForNextOccurrence) {
      for (let idx = endIdx + 1; idx <= endIdx + EXTEND_SCAN_MONTHS; idx++) {
        const year = Math.floor(idx / 12)
        const month = idx % 12
        if (row.frequency === "bimonthly" && row.bimonthly_parity && !matchesBimonthlyParity(month, row.bimonthly_parity)) {
          continue
        }
        const nominalDate = billOccurrenceInMonth(row.due_date, year, month)
        if (row.paid_through && nominalDate <= row.paid_through) continue
        const date = row.grace_period_days
          ? toISODate(addDays(new Date(nominalDate + "T00:00:00"), row.grace_period_days))
          : nominalDate
        if (date > toISO) {
          out.push({ ...row, occurrenceDate: date })
          break
        }
      }
    }
  }
  return out
}

export type ItemStatus = "alreadyDue" | "upcoming"
export type ClassifiedItem<T> = T & { occurrenceDate: string; itemStatus: ItemStatus }

// Splits bills/debts into "already due earlier this cycle" (this month's
// occurrence falls on or before today) vs "due before your next paycheck"
// (still to come). Built so a big bill like a mortgage that quietly drops
// out of the subtraction -- because its due day already passed this month
// -- doesn't just vanish with no explanation; the UI can show both lists
// instead of just a total.
//
// CRITICAL FIX (Sep 9 2026, Vince): now takes the actual last-paycheck date
// as its scan anchor instead of always scanning back to the start of the
// calendar month -- that calendar-month scan could disagree with the
// paycheck-cycle window computeSafeToSpend/computeDebtPayoffAffordability
// use (see alreadyDueSinceLastPaycheck above), which is exactly what
// produced the live contradiction ("$97.98 isn't reserved above" while the
// headline number didn't reserve it either). Pass
// SafeToSpendResult.lastPaycheckDate here so this breakdown always agrees
// with what's actually subtracted. Falls back to the old calendar-month
// scan only when no last-paycheck date is available yet (e.g. a brand new
// income row with no past occurrence on record) -- same shape as before
// this fix, just no longer the normal case.
export function classifyItemsAroundCycle<T extends { amount: number; due_date: number | null }>(
  rows: T[],
  todayISO: string,
  nextPaycheckISO: string,
  lastPaycheckISO?: string | null,
  // Sep 10 2026, Vince -- see itemsDueInWindow's own comment. Callers pass
  // this for DEBTS only (not bills), so a debt like a mortgage that's
  // already paid_through this window still shows up once, itemized, as
  // "upcoming" (its real next due date), instead of the total quietly
  // including money for it that the itemized list can't account for.
  opts?: { extendForNextOccurrence?: boolean }
): ClassifiedItem<T>[] {
  let scanFromISO: string
  if (lastPaycheckISO) {
    scanFromISO = lastPaycheckISO
  } else {
    const today = new Date(todayISO + "T00:00:00")
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    scanFromISO = toISODate(addDays(monthStart, -1))
  }
  const items = itemsDueInWindow(rows, scanFromISO, nextPaycheckISO, opts)
  return items.map((it) => ({
    ...it,
    itemStatus: (it.occurrenceDate <= todayISO ? "alreadyDue" : "upcoming") as ItemStatus,
  }))
}

export type ItemOccurrenceStatus = "no-date" | "overdue" | "grace" | "due-soon" | "upcoming"
export type ItemOccurrence =
  | { occurrenceDate: null; daysUntil: null; status: "no-date" }
  | { occurrenceDate: string; daysUntil: number; status: ItemOccurrenceStatus }

// How far forward to scan looking for a not-yet-satisfied occurrence --
// comfortably covers even a bimonthly item whose parity hasn't matched in a
// while, or several months of paid_through in a row.
const OCCURRENCE_SCAN_MONTHS = 13

// QA fix (Sep 4 2026, Vince): "Bills & Debts -> Next 7 days must understand
// due dates, recurrence, paid_through, bimonthly rules... the difference
// [from Safe to Spend] should be the date filter, not a completely
// different interpretation of the obligation." Before this, Bills & Debts
// ran its own ad hoc statusOf() that always read the CURRENT calendar
// month's occurrence and never checked paid_through or bimonthly_parity at
// all -- so a bill already confirmed paid via "Mark as paid" (paid_through)
// kept showing as due/overdue/in-grace there even though Safe to Spend had
// correctly excluded it (the exact bug caught live: Onity Mortgage, marked
// paid_through 2026-09-01, still showing "Grace period" and $2,220.86 on
// Bills & Debts while Safe to Spend rightly left it out entirely). This is
// the single shared primitive both now use for "what's this item's status
// right now" -- same occurrence rules as itemsDueInWindow (bimonthly
// parity, paid_through, grace period), just scanning forward for the next
// not-yet-satisfied occurrence instead of summing everything inside a fixed
// window. The returned occurrenceDate is the NOMINAL due date (what the UI
// shows as "due"), while daysUntil/status are computed from the
// grace-adjusted EFFECTIVE date -- same split lib/bills-debts's old
// statusOf() used, kept so a grace-period item's displayed date doesn't
// change, only whether/when it's treated as satisfied.
export function nextItemOccurrence<
  T extends {
    due_date: number | null
    grace_period_days?: number | null
    paid_through?: string | null
    frequency?: string | null
    bimonthly_parity?: "odd" | "even" | null
  }
>(row: T, todayISO: string): ItemOccurrence {
  if (!row.due_date) return { occurrenceDate: null, daysUntil: null, status: "no-date" }
  const today = new Date(todayISO + "T00:00:00")
  const startIdx = today.getFullYear() * 12 + today.getMonth()
  for (let step = 0; step < OCCURRENCE_SCAN_MONTHS; step++) {
    const idx = startIdx + step
    const year = Math.floor(idx / 12)
    const month = idx % 12
    if (row.frequency === "bimonthly" && row.bimonthly_parity && !matchesBimonthlyParity(month, row.bimonthly_parity)) {
      continue
    }
    const nominalDate = billOccurrenceInMonth(row.due_date, year, month)
    if (row.paid_through && nominalDate <= row.paid_through) continue
    const effectiveDate = row.grace_period_days
      ? toISODate(addDays(new Date(nominalDate + "T00:00:00"), row.grace_period_days))
      : nominalDate
    const daysUntil = daysBetween(todayISO, effectiveDate)
    const inGrace = !!row.grace_period_days && todayISO > nominalDate && todayISO <= effectiveDate
    const status: ItemOccurrenceStatus = daysUntil < 0 ? "overdue" : inGrace ? "grace" : daysUntil <= 7 ? "due-soon" : "upcoming"
    return { occurrenceDate: nominalDate, daysUntil, status }
  }
  return { occurrenceDate: null, daysUntil: null, status: "no-date" }
}

export function sumDueInWindow(
  rows: {
    amount: number
    due_date: number | null
    grace_period_days?: number | null
    paid_through?: string | null
    frequency?: string | null
    bimonthly_parity?: "odd" | "even" | null
  }[],
  fromISO: string,
  toISO: string,
  opts?: { extendForNextOccurrence?: boolean }
): number {
  return itemsDueInWindow(rows, fromISO, toISO, opts).reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
}

// Real, currently-outstanding obligations: due after the last paycheck that
// actually landed, on or before today, and not yet marked paid (paid_through
// already excludes anything settled -- see itemsDueInWindow). This is
// exactly the "assumed already paid from your last paycheck" bucket the
// Dashboard/Survival Mode/Safe to Spend warn about.
//
// CRITICAL FIX (Sep 9 2026, Vince, reviewing a live screenshot): "the app
// says $97.98 in bills already past their due date isn't reserved above...
// that's confusing, the dashboard is effectively saying [a higher number]
// but the real Safe to Spend is $97.98 lower." That assumption -- an item
// whose due date passed is "probably already paid, so don't reserve it
// again" -- doesn't hold once paid_through is the actual source of truth
// for "was this paid": anything still showing up here has NOT been marked
// paid, so it's still owed and hasn't left the account. computeSafeToSpend
// now widens its own due-window to include this instead of just warning
// about it, and computeDebtPayoffAffordability subtracts it from today's
// real cash before ever comparing to a future paycheck cycle -- both read
// this one function so they can't drift apart on what "already due" means.
export function alreadyDueSinceLastPaycheck(input: {
  income: CycleIncome[]
  bills: CycleBill[]
  debts: CycleDebt[]
  today?: Date
}): number {
  const today = input.today ?? new Date()
  const todayStr = toISODate(today)
  if (input.income.length === 0) return 0

  // Same "scan back 2 months, that's plenty" convention projectPaycheckCycles
  // uses to find the most recent past paycheck.
  const scanStartIdx = today.getFullYear() * 12 + today.getMonth() - 2
  const scanStartYear = Math.floor(scanStartIdx / 12)
  const scanStartMonth = ((scanStartIdx % 12) + 12) % 12
  const occurrences = projectIncomeOccurrences(input.income, scanStartYear, scanStartMonth, 6)
  const past = occurrences.filter((o) => o.date <= todayStr)
  if (past.length === 0) return 0
  const lastPaycheckDate = past[past.length - 1].date

  const billsDue = sumDueInWindow(input.bills, lastPaycheckDate, todayStr)
  const debtsDue = sumDueInWindow(
    excludeTransferCoveredDebts(input.debts, input.income).map((d) => ({
      amount: d.minimum_payment,
      due_date: d.due_date,
      grace_period_days: d.grace_period_days,
      paid_through: d.paid_through,
    })),
    lastPaycheckDate,
    todayStr
  )
  return Math.round((billsDue + debtsDue) * 100) / 100
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

// Monthly sibling of goalContributionRate, for the calendar-month "Committed
// Money" rollup (lib/monthlySafeToSpend.ts) instead of a per-paycheck one.
// Same rules (skip inactive/no-deadline/already-funded goals, an overdue
// deadline counts its full remaining amount), just denominated in months
// remaining instead of paycheck occurrences remaining -- deliberately NOT
// derived from goalContributionRate by multiplying by paychecks-per-month,
// since a user can have more than one income row at different frequencies
// and there'd be no single "paychecks per month" to multiply by. A goal due
// later this same calendar month (monthsOut === 0) reserves its full
// remaining amount this month, same as goalContributionRate reserving the
// full amount once uniqueDates collapses to just one remaining occurrence.
export function goalContributionMonthlyRate(goals: CycleGoal[], asOfISO: string): number {
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
    const deadlineDate = new Date(g.deadline + "T00:00:00")
    const deadlineIdx = deadlineDate.getFullYear() * 12 + deadlineDate.getMonth()
    const monthsOut = deadlineIdx - (asOfYear * 12 + asOfMonth)
    if (monthsOut > GOAL_SCAN_MONTHS_FORWARD) continue
    const monthsRemaining = Math.max(1, monthsOut)
    total += remaining / monthsRemaining
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

  const spendableDebts = excludeTransferCoveredDebts(input.debts, input.income)

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
      spendableDebts.map((d) => ({
        amount: d.minimum_payment,
        due_date: d.due_date,
        grace_period_days: d.grace_period_days,
        paid_through: d.paid_through,
      })),
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

// ---------------------------------------------------------------------------
// Event-level balance timeline
// ---------------------------------------------------------------------------
//
// CRITICAL FIX (Sep 10 2026, Vince, live screenshot of 53rd Checking showing
// -$21.84): "I need to calculate what is safe to spend based off this info...
// Right now you have people doing the math and that's not what it's supposed
// to do, the app is to do the math and show what is left over to pay down
// debt. I am not negative on my accounts."
//
// Root cause, and it is a structural one: every Safe-to-Spend number in this
// app was computed as `startingCash - billsDue - debtsDue` over a window that
// ran from the last paycheck to the END OF THE CALENDAR MONTH (and, since the
// Sep 10 extendForNextOccurrence fix, one payment past that). That window
// counted every dollar going OUT over ~3-6 weeks but not one dollar coming
// IN. Vince's card said "Until September 30 - 20 days" while subtracting
// $3,324.97; two $1,660 paychecks land inside those same 20 days and neither
// was credited. A person with $3,353.13 in the bank, $3,320 of pay arriving
// before month-end, and $3,324.97 of obligations was being told he was
// $21.84 in the hole. He is not, and no amount of tuning the OBLIGATION side
// of an income-blind subtraction was ever going to fix that.
//
// The replacement is the model a person actually uses when they check whether
// they can spend money: walk the calendar forward day by day, add paychecks
// when they land, subtract bills and debts when they come due, and watch for
// the LOWEST the balance ever gets. That low point is the honest answer to
// "how much can I spend today and still cover everything" -- spend more than
// that and you overdraft at that moment; spend that much and you never do.
//
// Two properties matter and both come free with this model:
//   1. Symmetry -- income and obligations are measured over the same window,
//      so the number can never again be negative purely because the window
//      was widened on one side only.
//   2. Timing -- money arriving on Sep 30 does not make it safe to spend on
//      Sep 10. Summing the whole window would say $3,348.16 is free; the low
//      point says $2,756.63, because Capital One Auto clears on the 15th and
//      the next paycheck is not until the 16th. The low point is the number
//      that is actually safe.
export const PROJECTION_HORIZON_DAYS = 62

// Far enough forward to always contain at least one full occurrence of every
// recurring shape this app models: a monthly bill, a monthly debt with a long
// grace period (a mortgage nominally due the 1st with 15 days of grace lands
// on the 16th of the following month), and a bimonthly bill that only recurs
// every other month. Deliberately fixed rather than "end of month" -- a
// month-end horizon shrinks to nearly nothing on the 28th, which is exactly
// when a person most needs to see what is coming.
export function projectionHorizonISO(today: Date): string {
  return toISODate(addDays(today, PROJECTION_HORIZON_DAYS))
}

export type BalanceEventKind = "income" | "transfer" | "bill" | "debt"

export type BalanceEvent = {
  date: string
  kind: BalanceEventKind
  name: string
  // Signed against the running balance: income positive, everything else
  // negative. Sums in BalanceTimeline below are reported unsigned.
  delta: number
  balanceAfter: number
  // True for an obligation whose effective due date already passed without
  // being marked paid -- still real money that has to leave, so it is applied
  // immediately at the start of the projection rather than sorted into the
  // past where it would silently vanish. See pastDueFromISO below.
  pastDue: boolean
}

export type BalanceTimeline = {
  startingBalance: number
  fromISO: string
  toISO: string
  events: BalanceEvent[]
  incomeIn: number
  transfersOut: number
  billsOut: number
  debtsOut: number
  endingBalance: number
  // The whole point of this file's existence -- see the header comment. Never
  // higher than startingBalance (you cannot spend more than you hold today no
  // matter how healthy the forecast is).
  lowestBalance: number
  // The date the low point happens, or null when nothing scheduled ever dips
  // below today's balance -- "today is the tightest it gets."
  lowestDate: string | null
  // Everything in / out from now through the low point INCLUSIVE, so a UI can
  // render startingBalance + incomeThroughLowest - outflowThroughLowest and
  // have it tie out to lowestBalance exactly. Vince has caught this app
  // showing a headline that its own breakdown could not reproduce more than
  // once; these two fields exist so that cannot happen here.
  incomeThroughLowest: number
  outflowThroughLowest: number
  // Obligations skipped because they came due on or before the entered
  // balance's own as-of date -- see balanceAsOfISO below. Surfaced rather
  // than silently dropped, so the UI can list them as "already in your
  // balance" and the user can spot one that genuinely didn't get paid.
  assumedSettled: { date: string; name: string; amount: number }[]
  assumedSettledTotal: number
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function projectBalanceTimeline(input: {
  startingBalance: number
  // Exclusive lower bound -- "today". Income and obligations dated on or
  // before this are already reflected in startingBalance and are not re-applied
  // (except unpaid past-due obligations, see pastDueFromISO).
  fromISO: string
  // Inclusive upper bound -- see projectionHorizonISO.
  toISO: string
  // Obligations (not income) are scanned from here instead of fromISO, so a
  // bill or debt whose due date has already passed but that has NOT been
  // marked paid still gets subtracted. Normally the last paycheck date. Those
  // occurrences are stamped at fromISO so they hit the running balance right
  // away. Omit to scan obligations from fromISO like everything else.
  pastDueFromISO?: string | null
  // CRITICAL FIX (Sep 10 2026, Vince): "the water bill was already paid on
  // 9-2... I can't keep going back and forth telling you this was paid, some
  // bills get paid early when people have money to pay them."
  //
  // The date startingBalance was actually accurate as of (a cash account's
  // balance_as_of). Any obligation whose effective due date falls on or
  // before it has ALREADY come out of that balance -- the number the user
  // read off their bank is net of it -- so subtracting it again is a
  // straight double-count. The app was doing exactly that: Chime's balance
  // was entered as of Sep 9, and Meijer (due Sep 4), Netflix (Sep 6) and
  // Anthropic (Sep 7) were all subtracted a second time on top of it as
  // "past due and unpaid," pushing that account negative on paper.
  //
  // This is the variable that was missing from BOTH previous answers to the
  // past-due question. On Sep 4 the call was "leave past-due items out, they
  // may have cleared already"; on Sep 9 it flipped to "reserve them, unmarked
  // means unpaid." Neither is right on its own, because whether an item is
  // already in the balance depends entirely on WHEN that balance was taken.
  // Due on or before the balance date: it's in there, don't count it twice.
  // Due after it but before today: genuinely not reflected yet, still
  // reserve it. Nothing here needs the user to confirm anything.
  //
  // Omit (or pass null) to keep the old behavior of reserving every unpaid
  // past-due occurrence -- correct when startingBalance is a projection
  // rather than a real dated balance.
  balanceAsOfISO?: string | null
  income: CycleIncome[]
  bills: (CycleBill & { name?: string | null })[]
  debts: (CycleDebt & { name?: string | null })[]
}): BalanceTimeline {
  const { startingBalance, fromISO, toISO } = input
  const from = new Date(fromISO + "T00:00:00")
  const to = new Date(toISO + "T00:00:00")
  const monthCount = to.getFullYear() * 12 + to.getMonth() - (from.getFullYear() * 12 + from.getMonth()) + 1

  type Raw = { date: string; kind: BalanceEventKind; name: string; delta: number; pastDue: boolean }
  const raw: Raw[] = []

  for (const o of projectIncomeOccurrences(input.income, from.getFullYear(), from.getMonth(), monthCount)) {
    if (o.date > fromISO && o.date <= toISO) {
      raw.push({ date: o.date, kind: "income", name: "Paycheck", delta: o.amount, pastDue: false })
    }
  }
  for (const o of projectTransferOccurrences(input.income, from.getFullYear(), from.getMonth(), monthCount)) {
    if (o.date > fromISO && o.date <= toISO) {
      raw.push({ date: o.date, kind: "transfer", name: "Transfer out", delta: -o.amount, pastDue: false })
    }
  }

  const obligationFrom = input.pastDueFromISO && input.pastDueFromISO < fromISO ? input.pastDueFromISO : fromISO
  const balanceAsOf = input.balanceAsOfISO ?? null
  const assumedSettled: { date: string; name: string; amount: number }[] = []

  // Returns null when this occurrence is already inside startingBalance (see
  // balanceAsOfISO) -- the caller records it as assumed-settled and does not
  // subtract it. Otherwise stamps a still-past-due occurrence at fromISO so
  // it hits the running balance immediately.
  const stamp = (occurrenceDate: string, name: string, amount: number): { date: string; pastDue: boolean } | null => {
    if (balanceAsOf && occurrenceDate <= balanceAsOf) {
      assumedSettled.push({ date: occurrenceDate, name, amount })
      return null
    }
    return occurrenceDate <= fromISO ? { date: fromISO, pastDue: true } : { date: occurrenceDate, pastDue: false }
  }

  const billRows = input.bills.map((b) => ({ ...b, amount: Number(b.amount) || 0 }))
  for (const b of itemsDueInWindow(billRows, obligationFrom, toISO)) {
    const amount = Number(b.amount) || 0
    const name = b.name || "Bill"
    const at = stamp(b.occurrenceDate, name, amount)
    if (!at) continue
    raw.push({ date: at.date, kind: "bill", name, delta: -amount, pastDue: at.pastDue })
  }

  const debtRows = excludeTransferCoveredDebts(input.debts, input.income).map((d) => ({
    ...d,
    amount: Number(d.minimum_payment) || 0,
  }))
  for (const d of itemsDueInWindow(debtRows, obligationFrom, toISO)) {
    const amount = Number(d.amount) || 0
    const name = d.name || "Debt payment"
    const at = stamp(d.occurrenceDate, name, amount)
    if (!at) continue
    raw.push({ date: at.date, kind: "debt", name, delta: -amount, pastDue: at.pastDue })
  }

  // Same-day ordering is deliberately conservative: money going OUT is applied
  // before money coming IN. When a bill and a paycheck land on the same date
  // there is no way to know which posts first, and assuming the bill does is
  // the direction that can only ever understate what is safe to spend.
  const kindOrder: Record<BalanceEventKind, number> = { bill: 0, debt: 0, transfer: 0, income: 1 }
  raw.sort((a, b) => (a.date === b.date ? kindOrder[a.kind] - kindOrder[b.kind] : a.date.localeCompare(b.date)))

  let balance = round2(startingBalance)
  let lowestBalance = balance
  let lowestDate: string | null = null
  let lowestIdx = -1
  let incomeIn = 0
  let transfersOut = 0
  let billsOut = 0
  let debtsOut = 0
  const events: BalanceEvent[] = []

  for (const e of raw) {
    balance = round2(balance + e.delta)
    if (e.kind === "income") incomeIn += e.delta
    else if (e.kind === "transfer") transfersOut += -e.delta
    else if (e.kind === "bill") billsOut += -e.delta
    else debtsOut += -e.delta
    if (balance < lowestBalance) {
      lowestBalance = balance
      lowestDate = e.date
      lowestIdx = events.length
    }
    events.push({ date: e.date, kind: e.kind, name: e.name, delta: e.delta, balanceAfter: balance, pastDue: e.pastDue })
  }

  let incomeThroughLowest = 0
  let outflowThroughLowest = 0
  for (let i = 0; i <= lowestIdx; i++) {
    const e = events[i]
    if (e.delta > 0) incomeThroughLowest += e.delta
    else outflowThroughLowest += -e.delta
  }

  return {
    startingBalance: round2(startingBalance),
    fromISO,
    toISO,
    events,
    incomeIn: round2(incomeIn),
    transfersOut: round2(transfersOut),
    billsOut: round2(billsOut),
    debtsOut: round2(debtsOut),
    endingBalance: balance,
    lowestBalance,
    lowestDate,
    incomeThroughLowest: round2(incomeThroughLowest),
    outflowThroughLowest: round2(outflowThroughLowest),
    assumedSettled: assumedSettled.sort((a, b) => a.date.localeCompare(b.date)),
    assumedSettledTotal: round2(assumedSettled.reduce((sum, a) => sum + a.amount, 0)),
  }
}
