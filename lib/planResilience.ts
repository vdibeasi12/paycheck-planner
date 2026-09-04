// lib/planResilience.ts
// "Paycheck Shield" -- stress-tests the paycheck plan lib/paycheckCycles.ts
// already knows how to project. The question isn't "how much money do I
// have," it's "how much can this plan withstand before a specific paycheck
// comes up short." Built entirely on income/bills/debts/goals -- no bank
// transaction feed needed or used.

import {
  projectPaycheckCycles,
  itemsDueInWindow,
  sumDueInWindow,
  excludeTransferCoveredDebts,
  toISODate,
  addDays,
  type CycleIncome,
  type CycleBill,
  type CycleDebt,
  type CycleGoal,
  type PaycheckCycle,
} from "./paycheckCycles"

// How much of a cycle's *original* (no-scenario) cushion has to survive for
// the scenario to still count as "tight" rather than "breaks" -- mirrors the
// 20% cushion threshold lib/safeToSpend.ts's whatIfSpend() already uses, so
// a purchase-affordability check and a stress test read the same way.
const TIGHT_CUSHION_RATIO = 0.2
// A cycle with little or no baseline cushion to begin with can't apply that
// same 20%-of-baseline math (20% of ~$0 is ~$0) -- for those, "tight" means
// the adjusted cushion is still non-negative but under this flat floor.
const THIN_CUSHION_FLOOR = 20

export type ScenarioVerdict = "survives" | "tight" | "breaks"

export type ScenarioKind =
  | "oneTimeExpense"
  | "incomeDelayed"
  | "incomeReducedPercent"
  | "missedPaycheck"
  | "recurringIncrease"

export type Scenario = {
  kind: ScenarioKind
  label: string
  // Interpreted per kind: oneTimeExpense/recurringIncrease -> dollars,
  // incomeDelayed -> days, incomeReducedPercent -> a 0-1 fraction.
  value: number
}

export type ScenarioCycleResult = {
  date: string
  // Real cumulative cash position at this cycle, with and without the
  // scenario applied (see PaycheckCycle.runningBalance) -- grounded in
  // actual starting cash rather than pretending this cycle starts at zero.
  baselineRunningBalance: number
  adjustedRunningBalance: number
  verdict: ScenarioVerdict
}

export type ScenarioResult = {
  scenario: Scenario
  cycles: ScenarioCycleResult[]
  worstVerdict: ScenarioVerdict
  survivedCount: number
  totalCount: number
}

export type PlanResilienceResult = {
  hasPlan: boolean
  cycles: PaycheckCycle[]
  weakestCycle: PaycheckCycle | null
  strengthScore: number
  scenarioResults: ScenarioResult[]
}

// The fixed stress-test menu. oneTimeExpense/recurringIncrease scenarios are
// evaluated independently against every projected cycle ("if this happened
// during THIS paycheck's window"), which is also exactly right for
// recurringIncrease since every cycle gets the same added amount -- a
// permanent increase applied uniformly, not a one-off shock to a single
// cycle.
export const DEFAULT_SCENARIOS: Scenario[] = [
  { kind: "oneTimeExpense", label: "Unexpected $250 expense", value: 250 },
  { kind: "oneTimeExpense", label: "$750 car repair", value: 750 },
  { kind: "oneTimeExpense", label: "$1,500 emergency", value: 1500 },
  { kind: "incomeDelayed", label: "Paycheck delayed 3 days", value: 3 },
  { kind: "incomeReducedPercent", label: "10% income reduction", value: 0.1 },
  { kind: "missedPaycheck", label: "Miss one paycheck", value: 0 },
  { kind: "recurringIncrease", label: "$150 higher monthly expenses", value: 150 },
]

function verdictFor(baseline: number, adjusted: number): ScenarioVerdict {
  if (adjusted < 0) return "breaks"
  if (baseline > 0 && adjusted < baseline * TIGHT_CUSHION_RATIO) return "tight"
  if (baseline <= 0 && adjusted < THIN_CUSHION_FLOOR) return "tight"
  return "survives"
}

function applyScenario(
  cycles: PaycheckCycle[],
  scenario: Scenario,
  bills: CycleBill[],
  debts: CycleDebt[]
): ScenarioResult {
  const results: ScenarioCycleResult[] = cycles.map((c) => {
    let adjustedAmount = c.amount
    let adjustedBillsDue = c.billsDue
    let adjustedDebtsDue = c.debtsDue

    if (scenario.kind === "oneTimeExpense" || scenario.kind === "recurringIncrease") {
      adjustedBillsDue += scenario.value
    } else if (scenario.kind === "incomeReducedPercent") {
      adjustedAmount = c.amount * (1 - scenario.value)
    } else if (scenario.kind === "missedPaycheck") {
      adjustedAmount = 0
    } else if (scenario.kind === "incomeDelayed") {
      // The paycheck itself doesn't shrink, but it arrives `value` days
      // later -- anything that comes due in that extra window has to be
      // covered by this same cushion before the (delayed) paycheck lands.
      const extendedTo = toISODate(addDays(new Date(c.date + "T00:00:00"), scenario.value))
      adjustedBillsDue = sumDueInWindow(bills, c.windowStart, extendedTo)
      adjustedDebtsDue = sumDueInWindow(
        excludeTransferCoveredDebts(debts).map((d) => ({ amount: d.minimum_payment, due_date: d.due_date })),
        c.windowStart,
        extendedTo
      )
    }

    // Only this one cycle is shocked ("if this happened during THIS
    // paycheck's window") -- everything carried in from before stays the
    // real, unshocked running balance, same as the baseline.
    const balanceCarriedIn = c.runningBalance - c.cushion
    const adjustedCushion = adjustedAmount - adjustedBillsDue - adjustedDebtsDue - c.goalContribution
    const adjustedRunningBalance = balanceCarriedIn + adjustedCushion
    return {
      date: c.date,
      baselineRunningBalance: c.runningBalance,
      adjustedRunningBalance,
      verdict: verdictFor(c.runningBalance, adjustedRunningBalance),
    }
  })

  const survivedCount = results.filter((r) => r.verdict === "survives").length
  const worstVerdict: ScenarioVerdict = results.some((r) => r.verdict === "breaks")
    ? "breaks"
    : results.some((r) => r.verdict === "tight")
    ? "tight"
    : "survives"

  return { scenario, cycles: results, worstVerdict, survivedCount, totalCount: results.length }
}

export function computePlanResilience(input: {
  income: CycleIncome[]
  bills: CycleBill[]
  debts: CycleDebt[]
  goals: CycleGoal[]
  today?: Date
  monthsForward?: number
  scenarios?: Scenario[]
  // Real cash on hand right now (see lib/cashBalance.ts) -- grounds every
  // projected cycle's runningBalance in actual money instead of treating
  // each paycheck as if it starts from zero. Without this, a plan can look
  // "vulnerable" here while Safe to Spend (which already grounds the very
  // next paycheck in this same real balance) shows plenty of room -- the
  // exact contradiction this field exists to close.
  startingCash?: number
}): PlanResilienceResult {
  const cycles = projectPaycheckCycles({
    income: input.income,
    bills: input.bills,
    debts: input.debts,
    goals: input.goals,
    today: input.today,
    monthsForward: input.monthsForward ?? 3,
    startingCash: input.startingCash ?? 0,
  })

  if (cycles.length === 0) {
    return { hasPlan: false, cycles: [], weakestCycle: null, strengthScore: 0, scenarioResults: [] }
  }

  const weakestCycle = cycles.reduce((worst, c) => (c.runningBalance < worst.runningBalance ? c : worst), cycles[0])

  const scenarios = input.scenarios ?? DEFAULT_SCENARIOS
  const scenarioResults = scenarios.map((s) => applyScenario(cycles, s, input.bills, input.debts))

  // Transparent point-penalty score, not a claimed industry-standard metric:
  // start at 100, -15 for any scenario that breaks at least one projected
  // paycheck, -5 for one that gets tight without breaking anything.
  let strengthScore = 100
  for (const r of scenarioResults) {
    if (r.worstVerdict === "breaks") strengthScore -= 15
    else if (r.worstVerdict === "tight") strengthScore -= 5
  }
  strengthScore = Math.max(0, Math.min(100, strengthScore))

  return { hasPlan: true, cycles, weakestCycle, strengthScore, scenarioResults }
}

export type NearTermRisk = {
  cycle: PaycheckCycle
  level: "breaks" | "tight"
}

// The soonest upcoming paycheck worth warning about, if any -- used to
// cross-link Paycheck Shield's own projection into Safe to Spend/Survival
// Mode/the Dashboard, which otherwise only ever look at the very next
// paycheck and can read as reassuring even when a later cycle (a mortgage
// landing two paychecks out, say) is already projected to come up short.
// Judges each cycle by its real runningBalance (real starting cash plus
// every cycle's net so far -- see projectPaycheckCycles), not its isolated
// cushion, so this agrees with Safe to Spend's own real-cash-grounded
// number instead of flagging a cycle as "breaks" just because that one
// paycheck's own bills outweigh its own size, when the money to cover it
// is actually already sitting in the account.
export function nearestWeakCycle(cycles: PaycheckCycle[]): NearTermRisk | null {
  for (const c of cycles) {
    if (c.runningBalance < 0) return { cycle: c, level: "breaks" }
  }
  for (const c of cycles) {
    const threshold = c.amount > 0 ? c.amount * TIGHT_CUSHION_RATIO : THIN_CUSHION_FLOOR
    if (c.runningBalance < threshold) return { cycle: c, level: "tight" }
  }
  return null
}

// The specific bills/debts due inside a cycle's window -- used to name real
// items ("Netflix, $15.99") in "Strengthen This Paycheck" suggestions rather
// than only showing an aggregate dollar figure.
export function itemsInCycleWindow<T extends { amount: number; due_date: number | null }>(
  cycle: PaycheckCycle,
  rows: T[]
): (T & { occurrenceDate: string })[] {
  return itemsDueInWindow(rows, cycle.windowStart, cycle.date)
}
