// lib/paycheckCapacity.ts
// "Paycheck Capacity" -- turns lib/paycheckCycles.ts's per-cycle cushion into
// a percentage-of-paycheck score and a plain-language tier, so "how much
// room does this paycheck have" reads as one glanceable number instead of a
// dollar figure that only means something next to the paycheck's own size
// (a $200 cushion is very different on a $500 paycheck than a $3,000 one).
// Pure presentation over the existing projection -- no new table, no new
// query, nothing persisted. Surfaced in two places: a badge per row in
// Paycheck Shield's "Upcoming paychecks" list (app/components/
// PaycheckShieldView.tsx), and the "If This Paycheck Could Talk" narrative
// on the Dashboard (app/components/PaycheckTalkCard.tsx), which compares the
// two nearest cycles instead of describing just one.

import type { PaycheckCycle } from "./paycheckCycles"

// Tuned against the two reference points this was mocked up against ($2,150
// paycheck, 10% -> Very Tight, 40% -> Healthy): anything under 20% reads as
// Very Tight, 40% and up reads as Healthy, and the 20-39% band in between is
// Moderate.
const VERY_TIGHT_MAX = 20
const HEALTHY_MIN = 40

export type CapacityLevel = "very_tight" | "moderate" | "healthy"

export type CycleCapacity = {
  date: string
  amount: number
  committed: number
  cushion: number
  // cushion / amount as a whole-number percent. Can go negative (a cycle
  // that can't cover its own bills) or above 100 (almost nothing
  // committed) -- shown as-is rather than clamped, since that's the signal.
  capacityPct: number
  level: CapacityLevel
}

export function levelFor(capacityPct: number): CapacityLevel {
  if (capacityPct < VERY_TIGHT_MAX) return "very_tight"
  if (capacityPct < HEALTHY_MIN) return "moderate"
  return "healthy"
}

export function capacityForCycle(cycle: PaycheckCycle): CycleCapacity {
  const committed = cycle.billsDue + cycle.debtsDue + cycle.goalContribution
  const capacityPct = cycle.amount > 0 ? Math.round((cycle.cushion / cycle.amount) * 100) : 0
  return {
    date: cycle.date,
    amount: cycle.amount,
    committed,
    cushion: cycle.cushion,
    capacityPct,
    level: levelFor(capacityPct),
  }
}

export function computeCapacityForCycles(cycles: PaycheckCycle[]): CycleCapacity[] {
  return cycles.map(capacityForCycle)
}

// A gap has to clear both a percentage-point and a dollar floor before it's
// worth telling someone to act on it -- otherwise two paychecks that are
// basically the same (say 34% vs 37%) would generate a "move your money"
// recommendation out of noise.
const MATERIAL_PCT_GAP = 15
const MATERIAL_DOLLAR_GAP = 50

export type PaycheckTalkRecommendation = {
  // defer_to_next: this paycheck is the tight one -- hold off on optional
  // extra payments and let the next one (with more room) absorb them.
  // front_load_now: the reverse -- this paycheck has the room and the next
  // one won't, so an optional extra payment is better made now.
  kind: "defer_to_next" | "front_load_now"
  targetDate: string
  amountGap: number
}

export type PaycheckTalkNarrative = {
  thisCycle: CycleCapacity
  nextCycle: CycleCapacity | null
  headline: string
  detail: string
  recommendation: PaycheckTalkRecommendation | null
}

// "If This Paycheck Could Talk" -- compares the soonest upcoming paycheck
// against the one after it and, when the gap is real, names which direction
// to move discretionary money (an optional extra debt payment, a savings
// contribution) rather than just showing both numbers and leaving the
// comparison to the user. Dollar amounts are returned as plain numbers, not
// formatted strings -- the caller has the user's currency preference
// (useFormatCurrency) and this module doesn't.
export function generatePaycheckTalk(cycles: CycleCapacity[]): PaycheckTalkNarrative | null {
  if (cycles.length === 0) return null
  const thisCycle = cycles[0]
  const nextCycle = cycles[1] ?? null

  const committedPct =
    thisCycle.amount > 0 ? Math.round((thisCycle.committed / thisCycle.amount) * 100) : 0
  const detail = `${committedPct}% is committed before you have any flexible spending.`

  let headline: string
  if (thisCycle.level === "very_tight") headline = "This paycheck is carrying a heavy load."
  else if (thisCycle.level === "healthy") headline = "This paycheck has plenty of room."
  else headline = "This paycheck is holding steady."

  let recommendation: PaycheckTalkRecommendation | null = null
  if (nextCycle) {
    const pctGap = nextCycle.capacityPct - thisCycle.capacityPct
    const dollarGap = nextCycle.cushion - thisCycle.cushion

    if (pctGap >= MATERIAL_PCT_GAP && dollarGap >= MATERIAL_DOLLAR_GAP && thisCycle.level !== "healthy") {
      recommendation = { kind: "defer_to_next", targetDate: nextCycle.date, amountGap: dollarGap }
    } else if (
      -pctGap >= MATERIAL_PCT_GAP &&
      -dollarGap >= MATERIAL_DOLLAR_GAP &&
      nextCycle.level !== "healthy"
    ) {
      recommendation = { kind: "front_load_now", targetDate: nextCycle.date, amountGap: -dollarGap }
    }
  }

  return { thisCycle, nextCycle, headline, detail, recommendation }
}
