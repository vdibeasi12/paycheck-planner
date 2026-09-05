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

import { projectPaycheckCycles, type CycleIncome, type CycleBill, type CycleDebt, type CycleGoal } from "./paycheckCycles"

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
  // black box. Null in two cases, both meaning "today's real cash is the
  // binding constraint, not a future paycheck cycle": there's no
  // projectable plan yet (no income/pay date), or every projected cycle
  // ahead is actually healthier than what's on hand right now. Either way
  // maxSafeToPayoff falls back to today's real cash minus the reserve.
  tightestDate: string | null
  tightestRunningBalance: number
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

  const cycles = projectPaycheckCycles({
    income: input.income,
    bills: input.bills,
    debts: input.debts,
    goals: input.goals,
    today: input.today,
    startingCash: input.startingCash,
  }).slice(0, input.cyclesToConsider ?? 4)

  if (cycles.length === 0) {
    return {
      maxSafeToPayoff: input.startingCash - reserve,
      reserve,
      tightestDate: null,
      tightestRunningBalance: input.startingCash,
    }
  }

  // CRITICAL FIX (Sep 5 2026, Vince): a projected cycle's runningBalance is
  // only ever checked AFTER that cycle's own paycheck has already landed
  // and paid that cycle's own bills -- so if the very next paycheck
  // comfortably covers thin near-term bills, every projected runningBalance
  // can come back HIGHER than today's actual startingCash, even while some
  // LATER cycle's own paycheck doesn't cover that cycle's own bills (the
  // shortfall gets absorbed by cash carried forward, not by borrowing
  // against the future). Comparing only cycles[].runningBalance -- as this
  // used to -- means "tightest" could be a number bigger than what's
  // actually in the bank right now, and maxSafeToPayoff would recommend
  // withdrawing more than the user currently has, days before any of that
  // relief ever arrives. Confirmed live: Vince's real Sep 2026 numbers
  // (startingCash $3,678.30) produced a $5,159.67 "safe to pay off"
  // recommendation under the old code -- more than a thousand dollars he
  // doesn't have yet. Today's actual cash on hand is now itself a
  // checkpoint in the comparison, same as any future cycle.
  const tightestCycle = cycles.reduce((worst, c) => (c.runningBalance < worst.runningBalance ? c : worst), cycles[0])
  if (input.startingCash <= tightestCycle.runningBalance) {
    // Nothing projected ahead is actually tighter than what's on hand right
    // now -- today's real balance is the binding constraint, not a future
    // paycheck cycle.
    return {
      maxSafeToPayoff: input.startingCash - reserve,
      reserve,
      tightestDate: null,
      tightestRunningBalance: input.startingCash,
    }
  }
  return {
    maxSafeToPayoff: tightestCycle.runningBalance - reserve,
    reserve,
    tightestDate: tightestCycle.date,
    tightestRunningBalance: tightestCycle.runningBalance,
  }
}
