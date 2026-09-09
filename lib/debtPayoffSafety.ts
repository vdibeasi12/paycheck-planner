// lib/debtPayoffSafety.ts
//
// "How much is safe to put toward debt, right now, without overdrafting or
// getting hit with an NSF fee." Sep 4 2026, Vince, after walking through
// "can I safely use $2,000 to pay off all my credit debt and still be
// covered for the 15th and 22nd" by hand: "the logic can review and let the
// person know what they can put towards debt, how much they need to keep
// in reserve -- otherwise they will spend the full $2,781.27 because it's
// marked safe to spend... A person doesn't want to read everything about
// their debt, they want to know how much they can give to the debt to get
// them out of debt. They need to know about a financial cushion."
//
// Built on the exact same projection lib/planResilience.ts's "Then what"
// panel uses (lib/paycheckCycles.ts's projectPaycheckCycles) so this can
// never disagree with Safe to Spend or Paycheck Shield -- the only new
// idea here is running that same projection with a candidate debt payoff
// already subtracted out, to answer "if I send this much to debt today,
// does the rest of my plan still hold."

import {
  projectPaycheckCycles,
  type CycleIncome,
  type CycleBill,
  type CycleDebt,
  type CycleGoal,
} from "./paycheckCycles"
import { computeSafeToSpend } from "./safeToSpend"

// A deliberately modest floor, not a claim about what anyone SHOULD keep on
// hand -- it just keeps a payoff recommendation from being calculated down
// to the exact last cent of projected cash, which is exactly how someone
// ends up overdrawn or hit with an NSF fee the moment a bill posts a day
// earlier than expected.
export const DEFAULT_PAYOFF_RESERVE = 150

export type DebtPayoffAffordability = {
  // The most that can come out of checking today and still clear every
  // projected bill/debt/goal contribution over the forecast horizon without
  // dipping below `reserve`. Can be negative -- that means the plan is
  // already tighter than the reserve wants, before a single dollar goes to
  // debt, and putting anything toward debt right now isn't safe.
  maxSafeToPayoff: number
  reserve: number
  // Where in the forecast horizon the cushion is thinnest -- the one real
  // cycle a payoff actually has to respect, named so the number isn't a
  // black box. Null in two cases, both meaning "today's real cash, net of
  // everything due through the end of this calendar month (the same window
  // lib/safeToSpend.ts reserves), is the binding constraint, not a future
  // paycheck cycle": there's no projectable plan yet (no income/pay date),
  // or every projected cycle ahead is actually healthier than what's on
  // hand right now. Either way maxSafeToPayoff falls back to that figure
  // minus the reserve.
  tightestDate: string | null
  tightestRunningBalance: number
}

export type MultiCycleCheckpoint = {
  // Real cash on hand at this point in the projection -- see
  // findTightestCheckpoint below for exactly which point.
  balance: number
  // null means "today, net of anything already due and unpaid" -- same
  // convention DebtPayoffAffordability.tightestDate already uses.
  date: string | null
}

// CRITICAL FIX (Sep 9 2026, Vince, live screenshot of 53rd Checking): "53rd
// is not counting the personal loan and it needs to earmark the up coming
// mortgage payment." Chasing that down surfaced a real, separate gap: this
// function used to compare only two kinds of checkpoint -- todayCheckpoint
// (today's cash, net of anything ALREADY due and unpaid) and each projected
// cycle's runningBalance (the balance right AFTER that cycle's own paycheck
// lands and pays that cycle's own bills). It never checked the point right
// BEFORE a cycle's paycheck lands but AFTER that cycle's bills/debts have
// come due -- for the very first cycle, that's mathematically identical to
// Safe to Spend's own headline number (lib/safeToSpend.ts's safeToSpend),
// which meant Extra Debt Payment could recommend sending away more than
// Safe to Spend itself says is free, whenever something (like Capital One
// Auto, due the 15th) falls between today and the next paycheck (the
// 16th). Confirmed on Vince's real 53rd numbers: the old code recommended
// $3,153.13 (today's $3,303.13 minus the $150 reserve, since nothing was
// due YET as of today) -- but $596.50 of that is owed to Capital One Auto
// six days before the next paycheck, so sending $3,153.13 away today would
// leave only $150, not enough to cover it. The true tightest point is
// $2,706.63 (today's cash minus Capital One Auto), the same number Safe to
// Spend already shows -- the two engines can no longer disagree about it.
//
// runningBalance_i = runningBalance_(i-1) + amount_i - billsDue_i -
// debtsDue_i - goalContribution_i (see projectPaycheckCycles), so the
// balance right before cycle i's own paycheck lands is simply
// runningBalance_i - amount_i.
function findTightestCheckpoint(input: {
  startingCash: number
  income: CycleIncome[]
  bills: CycleBill[]
  debts: CycleDebt[]
  goals: CycleGoal[]
  today?: Date
  cyclesToConsider?: number
}): MultiCycleCheckpoint {
  // CRITICAL FIX (Sep 9 2026, Vince, monthly-window Safe to Spend): this used
  // to floor todayCheckpoint at alreadyDueSinceLastPaycheck -- everything
  // ALREADY due as of today, the same narrower window Safe to Spend itself
  // used before the "subtract all bills for that month" fix. Now that
  // lib/safeToSpend.ts reserves everything due through the END OF THE
  // CALENDAR MONTH from today's real cash (not just what's already due, and
  // not just what's due before the next paycheck), todayCheckpoint has to
  // match that exactly -- otherwise Extra Debt Payment could recommend
  // sending away more than Safe to Spend's own headline number says is
  // free, the exact black-box contradiction this file exists to prevent
  // (see the comment above computeDebtPayoffAffordability). Reusing
  // computeSafeToSpend directly (rather than re-deriving the same
  // billsDue/debtsDue window by hand) means the two can never drift apart.
  const monthlyWindow = computeSafeToSpend({
    income: input.income,
    bills: input.bills,
    debts: input.debts,
    goals: [],
    today: input.today,
  })
  const todayCheckpoint = input.startingCash - monthlyWindow.billsDue - monthlyWindow.debtsDue

  const cycles = projectPaycheckCycles({
    income: input.income,
    bills: input.bills,
    debts: input.debts,
    goals: input.goals,
    today: input.today,
    startingCash: input.startingCash,
  }).slice(0, input.cyclesToConsider ?? 4)

  let tightest: MultiCycleCheckpoint = { balance: todayCheckpoint, date: null }
  for (const c of cycles) {
    const preCheckpoint = c.runningBalance - c.amount
    if (preCheckpoint < tightest.balance) {
      tightest = { balance: preCheckpoint, date: c.date }
    }
    if (c.runningBalance < tightest.balance) {
      tightest = { balance: c.runningBalance, date: c.date }
    }
  }
  return tightest
}

// Same projection, reserve already applied -- used to floor Safe to Spend
// itself (lib/accountSafeToSpend.ts) at whatever this multi-cycle search
// finds, on top of Extra Debt Payment above. Reserve defaults to 0 here
// (unlike computeDebtPayoffAffordability) because Safe to Spend has never
// carried a built-in cushion of its own -- see lib/safeToSpend.ts.
export function computeMultiCycleFloor(input: {
  startingCash: number
  income: CycleIncome[]
  bills: CycleBill[]
  debts: CycleDebt[]
  goals: CycleGoal[]
  today?: Date
  cyclesToConsider?: number
}): MultiCycleCheckpoint {
  return findTightestCheckpoint(input)
}

export function computeDebtPayoffAffordability(input: {
  // Real pooled Checking balance projected to today (lib/cashBalance.ts's
  // resolveStartingCash) -- same starting point Safe to Spend uses.
  startingCash: number
  income: CycleIncome[]
  bills: CycleBill[]
  // Whatever's actually still owed -- if the caller is asking "what if I
  // pay THESE off in full," it filters them out before calling this, so
  // their future minimum payments stop counting as upcoming obligations
  // (paid off means they never recur, not just "skipped this once").
  debts: CycleDebt[]
  goals: CycleGoal[]
  today?: Date
  // How many projected paychecks forward to check -- default 4 matches the
  // "Then what" look-ahead panel (this cycle + the next 3). Needs to reach
  // far enough to catch a grace-period-shifted debt like a mortgage nominally
  // due the 1st that doesn't actually land in the projection until 2-3
  // paychecks out -- see lib/planResilience.ts's buildUpcomingForecast.
  cyclesToConsider?: number
  reserve?: number
}): DebtPayoffAffordability {
  const reserve = input.reserve ?? DEFAULT_PAYOFF_RESERVE

  // findTightestCheckpoint's todayCheckpoint calls computeSafeToSpend
  // directly, so it's the exact same monthly reservation Safe to Spend
  // itself applies, and the pre-paycheck checkpoint for each projected cycle
  // (see findTightestCheckpoint above) is at least as tight -- so this can
  // never recommend sending away more than Safe to Spend itself says is
  // free, for today's window or any cycle further out.
  const tightest = findTightestCheckpoint(input)
  return {
    maxSafeToPayoff: tightest.balance - reserve,
    reserve,
    tightestDate: tightest.date,
    tightestRunningBalance: tightest.balance,
  }
}
