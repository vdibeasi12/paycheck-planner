// lib/__tests__/safeToSpendInvariants.test.ts
//
// Sep 9 2026, Vince, after reviewing the "What's committed" presentation
// fix: "97 passing tests doesn't necessarily mean the business logic is
// correct. It only tells you the existing test cases pass. The critical
// test here is whether the individual displayed transactions add up to the
// exact same total and whether that same value drives every Safe to Spend
// calculation." This file is that audit, written as permanent, re-runnable
// invariants rather than a one-off manual check -- so a future change that
// breaks the reconciliation fails a test immediately instead of waiting for
// the next live screenshot.
//
// Run with:
//   npx tsx lib/__tests__/safeToSpendInvariants.test.ts
//
// Reproduces Vince's own live numbers exactly (starting balance $3,649.31,
// $250.53 upcoming bills, $675.50 debt payments of which $57.99 is past due
// and unpaid, Safe to Spend $2,723.28, 7 days to the next paycheck,
// $389.04/day) so the invariants below are checked against the real
// scenario that surfaced the bug, not just an abstract one.

import { computeSafeToSpend, withStartingCash, type STSBill, type STSDebt, type STSIncome } from "../safeToSpend"
import { classifyItemsAroundCycle, alreadyDueSinceLastPaycheck, excludeTransferCoveredDebts } from "../paycheckCycles"
import { computeDebtPayoffAffordability, DEFAULT_PAYOFF_RESERVE } from "../debtPayoffSafety"

let passed = 0
let failed = 0

function assertEqual(actual: number, expected: number, label: string) {
  if (Math.abs(actual - expected) < 0.005) {
    passed++
    console.log(`  PASS  ${label} (${actual})`)
  } else {
    failed++
    console.error(`  FAIL  ${label} -- expected ${expected}, got ${actual}`)
  }
}

function assertTrue(cond: boolean, label: string) {
  if (cond) {
    passed++
    console.log(`  PASS  ${label}`)
  } else {
    failed++
    console.error(`  FAIL  ${label}`)
  }
}

console.log("Invariant test -- Vince's exact live scenario: $3,649.31 starting balance,")
console.log("  $250.53 upcoming bills, $617.51 upcoming debt payment, $57.99 past-due")
console.log("  unpaid debt payment, 7 days to the next paycheck")
{
  // today = the actual date this fix shipped (Sep 9 2026); next paycheck 7
  // days out (Sep 16) so daysUntilNextPaycheck matches Vince's own "$2,723.28
  // / 7 = $389.04/day" exactly. Biweekly income anchored so the most recent
  // past paycheck lands Sep 2 -- the window every calculation below has to
  // agree on.
  const today = new Date("2026-09-09T00:00:00")
  const income: STSIncome[] = [{ amount: 2578.4, frequency: "biweekly", next_pay_date: "2026-09-16", income_type: null }]
  const startingCashAmount = 3649.31

  const upcomingBill: STSBill & { name: string } = { name: "Upcoming Bill", amount: 250.53, due_date: 14 } // Sep 14 -- after today, before Sep 16
  const pastDueDebt: STSDebt & { name: string } = { name: "Past-Due Debt", minimum_payment: 57.99, due_date: 5 } // Sep 5 -- after last paycheck (Sep 2), on/before today (Sep 9), unpaid
  const upcomingDebt: STSDebt & { name: string } = { name: "Upcoming Debt", minimum_payment: 617.51, due_date: 15 } // Sep 15

  const bills = [upcomingBill]
  const debts = [pastDueDebt, upcomingDebt]

  let result = computeSafeToSpend({ income, bills, debts, goals: [], today })
  result = withStartingCash(result, { amount: startingCashAmount, source: "checking", asOf: "2026-09-09" })

  // --- Sanity: this is really Vince's scenario, not a different one ---
  assertEqual(result.daysUntilNextPaycheck ?? -1, 7, "7 days to the next paycheck, matching the live screenshot")
  assertEqual(result.billsDue, 250.53, "Upcoming bills matches the live figure")
  assertEqual(result.debtsDue, 675.5, "Debt payments (upcoming + past-due combined) matches the live figure")

  const totalCommitted = result.billsDue + result.debtsDue + result.goalContribution

  // --- Invariant 1: Starting Balance - Total Committed = Safe to Spend ---
  assertEqual(startingCashAmount - totalCommitted, result.safeToSpend, "Starting Balance - Total Committed = Safe to Spend")
  assertEqual(result.safeToSpend, 2723.28, "Safe to Spend is the exact live figure, $2,723.28")

  // --- Invariant 2: Safe to Spend / days = daily limit ---
  assertEqual(result.safeToSpend / (result.daysUntilNextPaycheck as number), result.dailyLimit as number, "Safe to Spend / days = daily limit")
  assertEqual(result.dailyLimit as number, 389.04, "daily limit is the exact live figure, $389.04/day")

  // --- What the UI actually displays: classifyItemsAroundCycle, anchored at
  // lastPaycheckDate exactly like PaycheckCountdown.tsx/SurvivalModeView.tsx
  // now call it (the Sep 9 2026 fix), same excludeTransferCoveredDebts
  // pre-filter the page files apply before handing debts to it. ---
  const spendableDebts = excludeTransferCoveredDebts(debts, income)
  const classifiedBills = classifyItemsAroundCycle(bills, "2026-09-09", result.nextPaycheckDate as string, result.lastPaycheckDate)
  const classifiedDebts = classifyItemsAroundCycle(
    spendableDebts.map((d) => ({ ...d, amount: d.minimum_payment })),
    "2026-09-09",
    result.nextPaycheckDate as string,
    result.lastPaycheckDate
  )
  const allCommittedItems = [...classifiedBills, ...classifiedDebts]
  const pastDueItems = allCommittedItems.filter((i) => i.itemStatus === "alreadyDue")
  const sumOfDisplayedItems = allCommittedItems.reduce((sum, i) => sum + i.amount, 0)
  const pastDueTotal = pastDueItems.reduce((sum, i) => sum + i.amount, 0)

  // --- Invariant 3: every bill/debt item appears exactly once, and the sum
  // of the individual displayed items equals Total Committed (there is no
  // goal contribution in this scenario, so billsDue+debtsDue IS Total
  // Committed here -- see the separate goal-contribution test below for the
  // case where that's not true). ---
  assertEqual(allCommittedItems.length, 3, "all 3 items (1 bill + 2 debts) appear, none dropped")
  assertEqual(sumOfDisplayedItems, result.billsDue + result.debtsDue, "sum of displayed items = billsDue + debtsDue")
  assertEqual(sumOfDisplayedItems, 926.03, "sum of displayed items is the exact live figure, $926.03")
  assertEqual(sumOfDisplayedItems, totalCommitted, "sum of displayed items = Total Committed (no goal contribution in this scenario)")

  // --- Invariant 4: the $57.99 past-due item is included exactly once --
  // one item, flagged, counted once toward the total above, not a second
  // time anywhere else. ---
  assertEqual(pastDueItems.length, 1, "exactly one item is flagged past due")
  assertEqual(pastDueTotal, 57.99, "the flagged item is the $57.99 debt")
  assertEqual(pastDueTotal, alreadyDueSinceLastPaycheck({ income, bills, debts, today }), "the UI's past-due total agrees with the shared reservation function computeSafeToSpend itself uses")

  // --- Invariant 5: no past-due item is deducted a second time anywhere --
  // removing it from the inputs entirely must lower Safe to Spend by
  // EXACTLY $57.99, not more (double-deducted) or less (under-deducted). ---
  const withoutPastDue = withStartingCash(
    computeSafeToSpend({ income, bills, debts: [upcomingDebt], goals: [], today }),
    { amount: startingCashAmount, source: "checking", asOf: "2026-09-09" }
  )
  assertEqual(result.safeToSpend, withoutPastDue.safeToSpend - 57.99, "removing the $57.99 past-due debt raises Safe to Spend by exactly $57.99 -- proves it was counted exactly once")

  // --- Invariant 6: Extra Debt Payment cannot consume any portion of the
  // $926.03 required commitments -- in particular, it can never treat the
  // $57.99 already earmarked for the past-due debt as available to send to
  // other debt. Provable directly from computeDebtPayoffAffordability's
  // structure (maxSafeToPayoff = min(todayCheckpoint, tightestCycle) -
  // reserve, and todayCheckpoint = startingCash - alreadyDue), asserted
  // here numerically against this exact scenario. ---
  const affordability = computeDebtPayoffAffordability({ startingCash: startingCashAmount, income, bills, debts, goals: [], today })
  assertTrue(
    affordability.maxSafeToPayoff <= startingCashAmount - pastDueTotal - DEFAULT_PAYOFF_RESERVE + 0.005,
    `Extra Debt Payment (${affordability.maxSafeToPayoff}) never exceeds startingCash - past-due - reserve (${startingCashAmount - pastDueTotal - DEFAULT_PAYOFF_RESERVE})`
  )
  assertTrue(
    affordability.maxSafeToPayoff <= startingCashAmount - DEFAULT_PAYOFF_RESERVE + 0.005,
    "Extra Debt Payment never exceeds startingCash - reserve, full stop"
  )
}

console.log("\nInvariant test -- an active goal contribution is NOT itemized in")
console.log("  classifyItemsAroundCycle (it isn't a bill or a debt), so 'sum of displayed")
console.log("  items' and 'Total Committed' only agree once the Goal contributions row is")
console.log("  added back in -- documenting that explicitly rather than leaving it assumed")
{
  const today = new Date("2026-09-09T00:00:00")
  const income: STSIncome[] = [{ amount: 2578.4, frequency: "biweekly", next_pay_date: "2026-09-16", income_type: null }]
  const bill: STSBill = { amount: 100, due_date: 14 }
  const goals = [{ target_amount: 1000, current_amount: 400, deadline: "2026-09-14", status: "active" }]

  let result = computeSafeToSpend({ income, bills: [bill], debts: [], goals, today })
  result = withStartingCash(result, { amount: 2000, source: "checking", asOf: "2026-09-09" })

  const classifiedBills = classifyItemsAroundCycle([bill], "2026-09-09", result.nextPaycheckDate as string, result.lastPaycheckDate)
  const sumOfDisplayedItems = classifiedBills.reduce((sum, i) => sum + i.amount, 0)
  const totalCommitted = result.billsDue + result.debtsDue + result.goalContribution

  assertTrue(result.goalContribution > 0, "sanity: this scenario actually has a nonzero goal contribution")
  assertTrue(
    sumOfDisplayedItems < totalCommitted,
    "the itemized bill/debt list alone (100) is LESS than Total Committed once a goal contribution is present -- confirms the UI's separate 'Goal contributions' row is load-bearing, not decorative"
  )
  assertEqual(sumOfDisplayedItems + result.goalContribution, totalCommitted, "itemized items + the separate Goal contributions row together DO equal Total Committed")
  assertEqual(2000 - totalCommitted, result.safeToSpend, "Starting Balance - Total Committed = Safe to Spend still holds with a goal contribution present")
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
