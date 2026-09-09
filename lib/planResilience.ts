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
import { shouldSplitByAccount } from "./accountSafeToSpend"
import { projectAccountBalance, type CashAccountRow } from "./cashBalance"

// Sep 4 2026, Vince: "if I have this much then how will I be able to pay my
// mortgage Oct 1, car payment Sept 15, and personal loan sept 22nd" -- Safe
// to Spend (lib/safeToSpend.ts) only ever shows the window through the VERY
// NEXT paycheck, by design (each cycle re-grounds itself in the real
// balance once that paycheck lands, rather than pretending to know the
// whole month up front). That's correct, but it means a bill landing two or
// three paychecks out just isn't on screen at all -- so a user has no way
// to see "yes, that later bill is already accounted for" without doing the
// cycle-by-cycle math themselves, which is exactly what led to this
// question. buildUpcomingForecast answers it directly: for each of the next
// few projected cycles (skip the current one -- that's what Safe to Spend
// already shows), name the specific bills/debts landing in it and whether
// the running balance survives paying them.

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
  debts: CycleDebt[],
  income: CycleIncome[]
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
        excludeTransferCoveredDebts(debts, income).map((d) => ({
          amount: d.minimum_payment,
          due_date: d.due_date,
          grace_period_days: d.grace_period_days,
          paid_through: d.paid_through,
        })),
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
  const scenarioResults = scenarios.map((s) => applyScenario(cycles, s, input.bills, input.debts, input.income))

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

// Same verdict math nearestWeakCycle already uses per-cycle, pulled out so
// a single cycle can be judged on its own (nearestWeakCycle instead scans
// every cycle looking for the earliest break/tight one across the whole
// plan -- a different question).
function cycleVerdict(cycle: PaycheckCycle): ScenarioVerdict {
  if (cycle.runningBalance < 0) return "breaks"
  const threshold = cycle.amount > 0 ? cycle.amount * TIGHT_CUSHION_RATIO : THIN_CUSHION_FLOOR
  if (cycle.runningBalance < threshold) return "tight"
  return "survives"
}

export type ForecastItem = { name: string; amount: number; occurrenceDate: string }

export type UpcomingCycleForecast = {
  date: string
  // QA fix (Sep 4 2026, Vince): "your Safe to Spend window ends September
  // 16, but Then what shows September 30 -- what happened to the paycheck
  // in between?" Nothing -- Sep 16 IS the real next paycheck, and it's
  // exactly what Safe to Spend already answers on the main card. Callers of
  // buildUpcomingForecast deliberately skip that cycle (see below) so this
  // list starts at the SECOND paycheck out -- but with nothing on screen
  // saying so, jumping straight to "September 30 paycheck" reads exactly
  // like a missing cycle instead of an intentionally skipped one. windowStart
  // (the previous projected paycheck -- i.e. the one Safe to Spend already
  // covers, for the first entry) lets the UI show the range instead of just
  // the end date, e.g. "Sep 16 -> Sep 30," so the continuity is visible
  // instead of something the user has to reverse-engineer.
  windowStart: string
  amount: number
  items: ForecastItem[]
  runningBalance: number
  verdict: ScenarioVerdict
}

// "Then what" -- named bills/debts due in each of the given cycles (already
// excluding transfer-covered debts is the caller's job, same as every other
// consumer of these rows) plus the real running balance and verdict for
// that cycle, so "is Sept 22's Avant payment covered" has a direct, dated
// answer instead of requiring the user (or Claude, by hand) to add it up.
// Callers typically pass cycles.slice(1) -- the current/next cycle is what
// Safe to Spend already shows.
export function buildUpcomingForecast<
  B extends { name: string; amount: number; due_date: number | null },
  D extends { name: string; amount: number; due_date: number | null }
>(cycles: PaycheckCycle[], bills: B[], debts: D[]): UpcomingCycleForecast[] {
  return cycles.map((cycle) => {
    const billItems = itemsInCycleWindow(cycle, bills)
    const debtItems = itemsInCycleWindow(cycle, debts)
    const items: ForecastItem[] = [...billItems, ...debtItems]
      .map((i) => ({ name: i.name, amount: i.amount, occurrenceDate: i.occurrenceDate }))
      .sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate))
    return {
      date: cycle.date,
      windowStart: cycle.windowStart,
      amount: cycle.amount,
      items,
      runningBalance: cycle.runningBalance,
      verdict: cycleVerdict(cycle),
    }
  })
}

// CRITICAL FIX (Sep 9 2026, Vince, live screenshot: "Paycheck Shield is
// still calculating 100% and that's incorrect"): this whole file, like
// lib/safeToSpend.ts before Round 6, was pooling every checking account
// into one balance and stress-testing that pool -- for someone who
// deliberately keeps separate accounts for separate obligations (53rd for
// the mortgage/car/personal loan, Chime for utilities/credit cards), that
// pooling can hide a REAL, already-confirmed shortfall (Chime alone is
// projected to -$753.78 by month-end -- see lib/accountSafeToSpend.ts) by
// averaging it against a healthy 53rd. A stress test that can't see that is
// a "100/100 STRONG" score built on a number that isn't actually true for
// either real account. This is the same fix Round 6 already applied to
// Safe to Spend/This Month/Extra Debt Payment, just for the one engine
// that hadn't gotten it yet.
//
// Deliberately opt-in via the same shouldSplitByAccount evidence gate as
// lib/accountSafeToSpend.ts -- everyone who hasn't split bills/debts/
// income across specific accounts keeps seeing the exact pooled
// computePlanResilience result they always have, unchanged.
type WithAccountLink = { cash_account_id?: string | null }

export type AccountPlanResilience<
  TBill extends CycleBill & WithAccountLink = CycleBill & WithAccountLink,
  TDebt extends CycleDebt & WithAccountLink = CycleDebt & WithAccountLink
> = {
  account: CashAccountRow
  result: PlanResilienceResult
  // This account's own linked rows -- needed by StrengthenPaycheckPanel
  // (which names specific bills/debts) when rendering one block per
  // account instead of the single pooled block.
  bills: TBill[]
  debts: TDebt[]
  income: CycleIncome[]
}

export type AccountSplitPlanResilienceResult<
  TBill extends CycleBill & WithAccountLink = CycleBill & WithAccountLink,
  TDebt extends CycleDebt & WithAccountLink = CycleDebt & WithAccountLink
> = {
  // false means "not split" -- caller should keep using the pooled
  // computePlanResilience result directly, unchanged. `accounts` is empty
  // in that case.
  isSplit: boolean
  accounts: AccountPlanResilience<TBill, TDebt>[]
  // A shield is only as strong as its weakest account, since money never
  // moves between them on its own -- the minimum of each account's own
  // strengthScore, not an average (an average would let a healthy 53rd
  // paper over a struggling Chime the same way pooling did). 0 when no
  // account has a projectable plan at all.
  overallStrengthScore: number
  // The account actually dragging the combined score down, so the UI can
  // name it directly instead of making the user hunt for which section is
  // the weak one. Null only when no account has a projectable plan.
  weakestAccount: AccountPlanResilience<TBill, TDebt> | null
}

export function computeAccountSplitPlanResilience<
  TBill extends CycleBill & WithAccountLink,
  TDebt extends CycleDebt & WithAccountLink
>(input: {
  checkingAccounts: CashAccountRow[]
  income: (CycleIncome & WithAccountLink)[]
  bills: TBill[]
  debts: TDebt[]
  goals: CycleGoal[]
  todayISO: string
  today?: Date
  monthsForward?: number
  scenarios?: Scenario[]
}): AccountSplitPlanResilienceResult<TBill, TDebt> {
  const { checkingAccounts, income, bills, debts, todayISO } = input

  const isSplit = shouldSplitByAccount(checkingAccounts, income, bills, debts)
  if (!isSplit) {
    return { isSplit: false, accounts: [], overallStrengthScore: 0, weakestAccount: null }
  }

  const accounts: AccountPlanResilience<TBill, TDebt>[] = checkingAccounts.map((account) => {
    const ownIncome = income.filter((i) => i.cash_account_id === account.id)
    // Same scheduling fallback as computeAccountSplitSafeToSpend: an account
    // with no income linked yet still gets a real projected cycle schedule
    // (from whichever income rows exist) rather than "no plan at all" --
    // the dollar amounts (bills/debts/startingCash) only ever use this
    // account's own linked items.
    const scheduleIncome = ownIncome.length > 0 ? ownIncome : income
    const ownBills = bills.filter((b) => b.cash_account_id === account.id)
    const ownDebts = debts.filter((d) => d.cash_account_id === account.id)
    const projectedBalance = projectAccountBalance(account, { income, bills, debts, todayISO })

    const result = computePlanResilience({
      income: scheduleIncome,
      bills: ownBills,
      debts: ownDebts,
      goals: [],
      today: input.today,
      monthsForward: input.monthsForward,
      scenarios: input.scenarios,
      startingCash: projectedBalance,
    })
    return { account, result, bills: ownBills, debts: ownDebts, income: scheduleIncome }
  })

  const scored = accounts.filter((a) => a.result.hasPlan)
  const overallStrengthScore =
    scored.length > 0 ? Math.min(...scored.map((a) => a.result.strengthScore)) : 0
  const weakestAccount =
    scored.length > 0
      ? scored.reduce((worst, a) => (a.result.strengthScore < worst.result.strengthScore ? a : worst), scored[0])
      : null

  return { isSplit: true, accounts, overallStrengthScore, weakestAccount }
}
