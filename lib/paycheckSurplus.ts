// lib/paycheckSurplus.ts
// "Paycheck Surplus" -- when a paycheck cycle closes with money still left
// over, ask the user what should happen to it, instead of letting it
// silently roll into "whatever's left" the way a flat monthly budget would.
//
// Uses computeSafeToSpend (lib/safeToSpend.ts) only to answer "is today a
// payday, and what was the previous one" -- that calculation's own
// `safeToSpend` figure is deliberately a live, as-of-today snapshot (what's
// still due between right now and the next paycheck), not a whole-cycle
// total, so it's the wrong number for "how much of the LAST paycheck ended
// up unspent." For that, this reuses projectPaycheckCycles
// (lib/paycheckCycles.ts) instead -- the same full-cycle commitments engine
// Paycheck Shield uses -- evaluated from just before the closed cycle
// started, so its `cushion` is the whole-cycle leftover for that one
// paycheck.
//
// Detection is pure and side-effect free (detectClosedCycleSurplus). Writing
// the resulting decision row, and applying the user's choice, both happen in
// app/api/paycheck-surplus/resolve/route.ts and app/dashboard/page.tsx --
// this file only answers "is there a surplus to ask about, and how much."

import { computeSafeToSpend, type STSIncome, type STSBill, type STSDebt, type STSGoal } from "./safeToSpend"
import { projectPaycheckCycles, toISODate } from "./paycheckCycles"

// Below this, prompting feels like nagging over pocket change rather than a
// real allocation decision.
export const MIN_SURPLUS_TO_PROMPT = 20

export type SurplusDecision = "debt" | "next_paycheck" | "buffer" | "goal" | "cushion"

export const SURPLUS_DECISIONS: { id: SurplusDecision; label: string; description: string; needsTarget: boolean }[] = [
  { id: "debt", label: "Accelerate debt", description: "Put it toward a debt balance right now.", needsTarget: true },
  { id: "goal", label: "Fund a goal", description: "Add it to one of your goals.", needsTarget: true },
  { id: "buffer", label: "Emergency buffer", description: "Set it aside as a cushion. Noted, no changes needed.", needsTarget: false },
  { id: "next_paycheck", label: "Fund next paycheck", description: "Let it carry the load for what's coming. Noted, no changes needed.", needsTarget: false },
  { id: "cushion", label: "Leave as spending cushion", description: "Keep it as flexible spending room. Noted, no changes needed.", needsTarget: false },
]

export type SurplusDetection = {
  cycleDate: string
  surplusAmount: number
}

/**
 * Did a paycheck cycle close, as of `today`, with money left over?
 *
 * Step 1: reuse computeSafeToSpend as-of yesterday just to answer "is today
 * a payday, and what was the previous one" -- if that calculation's "next
 * paycheck" lands exactly today, the previous one (lastPaycheckDate) is the
 * cycle that just closed.
 *
 * Step 2: re-run the full-cycle projection (projectPaycheckCycles) from a
 * vantage point just before that closed cycle started, so its first
 * projected cycle is dated exactly on the closed cycle's paycheck date, with
 * `cushion` computed over that cycle's *entire* window (the previous
 * paycheck through this one) rather than a single-day slice of it.
 */
export function detectClosedCycleSurplus(input: {
  income: STSIncome[]
  bills: STSBill[]
  debts: STSDebt[]
  goals: STSGoal[]
  today?: Date
}): SurplusDetection | null {
  const today = input.today ?? new Date()
  const todayISO = toISODate(today)
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

  const asOfYesterday = computeSafeToSpend({ ...input, today: yesterday })
  if (!asOfYesterday.hasIncome || asOfYesterday.missingPayDate) return null
  if (!asOfYesterday.lastPaycheckDate || !asOfYesterday.nextPaycheckDate) return null
  if (asOfYesterday.nextPaycheckDate !== todayISO) return null

  const closedCycleDate = asOfYesterday.lastPaycheckDate
  const justBeforeClosedCycle = new Date(new Date(closedCycleDate + "T00:00:00").getTime() - 24 * 60 * 60 * 1000)

  const cycles = projectPaycheckCycles({
    income: input.income,
    bills: input.bills,
    debts: input.debts,
    goals: input.goals,
    today: justBeforeClosedCycle,
    monthsForward: 3,
  })
  const closedCycle = cycles.find((c) => c.date === closedCycleDate)
  if (!closedCycle) return null
  if (closedCycle.cushion < MIN_SURPLUS_TO_PROMPT) return null

  return { cycleDate: closedCycleDate, surplusAmount: closedCycle.cushion }
}
