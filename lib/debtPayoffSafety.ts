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
  // black box. Null when there's no projectable plan yet (no income/pay
  // date), in which case maxSafeToPayoff falls back to today's real cash
  // minus the reserve -- the only number available.
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

  const tightest = cycles.reduce((worst, c) => (c.runningBalance < worst.runningBalance ? c : worst), cycles[0])
  return {
    maxSafeToPayoff: tightest.runningBalance - reserve,
    reserve,
    tightestDate: tightest.date,
    tightestRunningBalance: tightest.runningBalance,
  }
}
