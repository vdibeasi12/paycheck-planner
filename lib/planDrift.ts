// lib/planDrift.ts
// "Plan Drift" -- not "was this purchase planned," but "how far has the
// plan itself moved since it was made." Built on the same
// lib/paycheckCycles.ts projection engine as Safe-to-Spend, Paycheck Shield,
// and Plan Autopilot -- no separate computation, so this can never disagree
// with what those already show.
//
// Two pieces:
//  1. detectStartingCycleSnapshot -- called once per cycle, the moment it
//     starts (mirrors lib/paycheckSurplus.ts's detectClosedCycleSurplus,
//     just looking forward at the newly-starting cycle instead of backward
//     at the one that just closed). The result gets written to
//     paycheck_plan_snapshots and never touched again -- that's the
//     "original plan," frozen before the user can edit anything.
//  2. computeCurrentBreakdown -- re-runs the exact same projection for that
//     cycle's date using TODAY's live bills/debts/goals. Whatever changed
//     (a bill edited or removed, a debt's minimum payment changed, a goal's
//     target or deadline moved) shows up as a difference from the frozen
//     snapshot.
//
// Deliberately does NOT incorporate debt_payments or paycheck_surplus_decisions
// rows as "actuals" -- see the migration's comment for why that was tried
// and reverted (a surplus decision's cycle_date is the cycle the leftover
// money came FROM, not the cycle this snapshot is about, so blending them in
// attributed money to the wrong cycle).

import {
  projectPaycheckCycles,
  toISODate,
  type CycleIncome,
  type CycleBill,
  type CycleDebt,
  type CycleGoal,
} from "./paycheckCycles"
import { computeSafeToSpend } from "./safeToSpend"

const MS_PER_DAY = 24 * 60 * 60 * 1000

export type PlanBreakdown = {
  cycleDate: string
  amount: number
  billsAmount: number
  debtsAmount: number
  goalsAmount: number
  flexibleAmount: number
}

type DriftInput = {
  income: CycleIncome[]
  bills: CycleBill[]
  debts: CycleDebt[]
  goals: CycleGoal[]
  today?: Date
}

/**
 * Is today a payday? If so, return the full-cycle breakdown for the cycle
 * that's just starting -- the same "what this paycheck needs to cover"
 * projection Autopilot uses for a future cycle, just anchored at the moment
 * it actually arrives.
 */
export function detectStartingCycleSnapshot(input: DriftInput): PlanBreakdown | null {
  const today = input.today ?? new Date()
  const todayISO = toISODate(today)
  const yesterday = new Date(today.getTime() - MS_PER_DAY)

  const asOfYesterday = computeSafeToSpend({ ...input, today: yesterday })
  if (!asOfYesterday.hasIncome || asOfYesterday.missingPayDate) return null
  if (asOfYesterday.nextPaycheckDate !== todayISO) return null

  const cycles = projectPaycheckCycles({
    income: input.income,
    bills: input.bills,
    debts: input.debts,
    goals: input.goals,
    today: yesterday,
    monthsForward: 3,
  })
  const startingCycle = cycles.find((c) => c.date === todayISO)
  if (!startingCycle) return null

  return {
    cycleDate: startingCycle.date,
    amount: startingCycle.amount,
    billsAmount: startingCycle.billsDue,
    debtsAmount: startingCycle.debtsDue,
    goalsAmount: startingCycle.goalContribution,
    flexibleAmount: startingCycle.cushion,
  }
}

/**
 * Recomputes the same breakdown for an already-known cycle date, using
 * whatever the live bills/debts/goals data says right now. Works for a
 * cycle dated in the past (still in progress, or already closed) because
 * it re-anchors the projection to just before that cycle's own date rather
 * than to "today" -- same trick lib/paycheckSurplus.ts uses to re-derive a
 * closed cycle's full window.
 */
export function computeCurrentBreakdown(cycleDate: string, input: Omit<DriftInput, "today">): PlanBreakdown | null {
  const justBefore = new Date(new Date(cycleDate + "T00:00:00").getTime() - MS_PER_DAY)
  const cycles = projectPaycheckCycles({
    income: input.income,
    bills: input.bills,
    debts: input.debts,
    goals: input.goals,
    today: justBefore,
    monthsForward: 3,
  })
  const cycle = cycles.find((c) => c.date === cycleDate)
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

export type DriftCategory = "bills" | "debts" | "goals" | "flexible"

export type DriftResult = {
  billsDelta: number
  debtsDelta: number
  goalsDelta: number
  flexibleDelta: number
  totalDrift: number
  biggestShift: { category: DriftCategory; delta: number } | null
}

/**
 * current minus planned, per category. totalDrift sums the absolute value
 * of the three "committed" categories only (bills/debts/goals) -- flexible
 * is the residual effect of those three moving, not a separate cause, so
 * it's reported but not double-counted into the total.
 */
export function computeDrift(planned: PlanBreakdown, current: PlanBreakdown): DriftResult {
  const billsDelta = current.billsAmount - planned.billsAmount
  const debtsDelta = current.debtsAmount - planned.debtsAmount
  const goalsDelta = current.goalsAmount - planned.goalsAmount
  const flexibleDelta = current.flexibleAmount - planned.flexibleAmount
  const totalDrift = Math.abs(billsDelta) + Math.abs(debtsDelta) + Math.abs(goalsDelta)

  const candidates: { category: DriftCategory; delta: number }[] = [
    { category: "bills", delta: billsDelta },
    { category: "debts", delta: debtsDelta },
    { category: "goals", delta: goalsDelta },
  ]
  const biggest = candidates.reduce<{ category: DriftCategory; delta: number } | null>((max, c) => {
    if (Math.abs(c.delta) < 0.01) return max
    if (!max || Math.abs(c.delta) > Math.abs(max.delta)) return c
    return max
  }, null)

  return { billsDelta, debtsDelta, goalsDelta, flexibleDelta, totalDrift, biggestShift: biggest }
}
