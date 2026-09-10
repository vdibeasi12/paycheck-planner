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
//
// CRITICAL FIX (Sep 10 2026, Vince): everything below the signature was
// replaced. The old implementation compared two kinds of checkpoint and took
// the minimum -- projected paycheck cycles (which DO credit income), and a
// `todayCheckpoint` of `startingCash - a month of billsDue/debtsDue` (which
// does NOT). Being income-blind, todayCheckpoint was almost always the
// smallest of the set, so it won the min() and dragged Extra Debt Payment
// down with it: on Vince's real 53rd numbers it produced -$21.84 against an
// account holding $3,353.13 with $3,320 of pay arriving before month-end.
// computeSafeToSpend now projects an event-level balance timeline (see
// projectBalanceTimeline in lib/paycheckCycles.ts) whose low point already IS
// the tightest checkpoint, at finer resolution than paycheck boundaries could
// ever give -- it catches the dip between Capital One Auto clearing on the
// 15th and the paycheck landing on the 16th, which a per-cycle scan sampling
// only at paycheck dates can miss entirely. Delegating to it outright is both
// more correct and the strongest possible form of the guarantee this file has
// always claimed: Extra Debt Payment cannot disagree with Safe to Spend
// because it is now literally reading the same number.
function findTightestCheckpoint(input: {
  startingCash: number
  // Date startingCash was accurate as of -- anything due on or before it is
  // already inside that balance. See balanceAsOfISO in projectBalanceTimeline.
  startingCashAsOf?: string | null
  income: CycleIncome[]
  bills: CycleBill[]
  debts: CycleDebt[]
  goals: CycleGoal[]
  today?: Date
  // Accepted for call-site compatibility, no longer read: the timeline's
  // 62-day horizon (PROJECTION_HORIZON_DAYS) replaces a count of cycles, and
  // is deliberately fixed so the answer can't change shape depending on how
  // many paychecks happen to fall inside it.
  cyclesToConsider?: number
}): MultiCycleCheckpoint {
  const projected = computeSafeToSpend({
    income: input.income,
    bills: input.bills,
    debts: input.debts,
    goals: [],
    today: input.today,
    startingCash: input.startingCash,
    startingCashAsOf: input.startingCashAsOf,
  })
  // No projectable plan (no income at all, or no pay date on any income row):
  // computeSafeToSpend returns its zeroed `empty` result rather than a
  // projection, and treating that 0 as a real checkpoint would wrongly claim
  // an account with money in it can't afford a single dollar toward debt.
  // Today's real cash is the only honest number available -- same fallback
  // this function has always had. See Test 6 in debtPayoffSafety.test.ts.
  if (!projected.hasIncome || projected.missingPayDate || !projected.nextPaycheckDate) {
    return { balance: input.startingCash, date: null }
  }
  return { balance: projected.safeToSpend, date: projected.lowestDate }
}


// Same projection, reserve already applied -- used to floor Safe to Spend
// itself (lib/accountSafeToSpend.ts) at whatever this multi-cycle search
// finds, on top of Extra Debt Payment above. Reserve defaults to 0 here
// (unlike computeDebtPayoffAffordability) because Safe to Spend has never
// carried a built-in cushion of its own -- see lib/safeToSpend.ts.
export function computeMultiCycleFloor(input: {
  startingCash: number
  // Date startingCash was accurate as of -- anything due on or before it is
  // already inside that balance. See balanceAsOfISO in projectBalanceTimeline.
  startingCashAsOf?: string | null
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
  // Date startingCash was accurate as of -- anything due on or before it is
  // already inside that balance. See balanceAsOfISO in projectBalanceTimeline.
  startingCashAsOf?: string | null
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
