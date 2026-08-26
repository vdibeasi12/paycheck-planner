// lib/paycheckAutopilot.ts
// "Plan Autopilot" -- a few days before a predicted payday, auto-draft what
// that paycheck will need to cover, so an Autopilot-tier user doesn't have
// to go build that awareness themselves. Built entirely on top of the
// existing lib/paycheckCycles.ts projection engine (the same one
// lib/safeToSpend.ts and lib/planResilience.ts already use) -- this file
// just picks the one cycle that's N days out and relabels its fields as a
// proposal.
//
// Deliberately does NOT introduce a persisted, user-editable category budget
// (Bills/Debt/Savings/Spending/Buffer as separate mutable numbers). The
// breakdown here is fully derived from real bills/debts/goals records, same
// as everywhere else in the app -- "approving" a proposal (see
// app/api/paycheck-autopilot/decide/route.ts) acknowledges it, it doesn't
// write a separate plan that could drift from those real records.

import { projectPaycheckCycles, toISODate, type CycleIncome, type CycleBill, type CycleDebt, type CycleGoal } from "./paycheckCycles"

export type AutopilotProposal = {
  cycleDate: string
  amount: number
  billsAmount: number
  debtsAmount: number
  goalsAmount: number
  flexibleAmount: number
}

/**
 * The proposal for whichever projected cycle falls exactly `daysAhead` from
 * `today` -- null if no paycheck is projected on that exact date (e.g. an
 * irregular schedule, or the horizon doesn't reach that far).
 */
export function generateProposal(input: {
  income: CycleIncome[]
  bills: CycleBill[]
  debts: CycleDebt[]
  goals: CycleGoal[]
  today?: Date
  daysAhead: number
}): AutopilotProposal | null {
  const today = input.today ?? new Date()
  const targetDate = toISODate(new Date(today.getTime() + input.daysAhead * 24 * 60 * 60 * 1000))

  const cycles = projectPaycheckCycles({
    income: input.income,
    bills: input.bills,
    debts: input.debts,
    goals: input.goals,
    today,
    monthsForward: 3,
  })

  const cycle = cycles.find((c) => c.date === targetDate)
  if (!cycle) return null

  return {
    cycleDate: cycle.date,
    amount: cycle.amount,
    billsAmount: cycle.billsDue,
    debtsAmount: cycle.debtsDue,
    goalsAmount: cycle.goalContribution,
    flexibleAmount: cycle.cushion,
  }
}
