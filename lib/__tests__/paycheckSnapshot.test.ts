// lib/__tests__/paycheckSnapshot.test.ts
//
// Sep 12 2026. lib/paycheckSnapshot.ts feeds the dashboard's first screen, and
// its whole job is to split one already-correct number into parts WITHOUT
// becoming a second, disagreeing calculation. That is precisely the failure
// this codebase has hit repeatedly, so the invariant is pinned here rather
// than trusted.
//
// The property under test, on every scenario below:
//
//     onHand + incoming - (billsOut + debtsOut + transfersOut) === safeToSpend
//
// and safeToSpend is the engine's own figure, never one this file derived. If
// a future change to projectBalanceTimeline moves the low-point boundary, or
// adds an event kind, these fail loudly instead of the dashboard quietly
// showing a breakdown that does not add up to its own headline.
//
// Run with: npx tsx lib/__tests__/paycheckSnapshot.test.ts

import { computeSafeToSpend, withStartingCash, type STSBill, type STSDebt, type STSIncome } from "../safeToSpend"
import { buildPaycheckSnapshot } from "../paycheckSnapshot"

let passed = 0
let failed = 0

function assertTrue(cond: boolean, label: string) {
  if (cond) {
    passed++
    console.log(`  PASS  ${label}`)
  } else {
    failed++
    console.error(`  FAIL  ${label}`)
  }
}

function assertEqual(actual: number, expected: number, label: string) {
  assertTrue(Math.abs(actual - expected) < 0.005, `${label} (got ${actual}, expected ${expected})`)
}

const income: STSIncome[] = [{ amount: 2000, frequency: "biweekly", next_pay_date: "2026-01-17", income_type: null }]
const today = new Date("2026-01-10T00:00:00")

function run(
  bills: STSBill[],
  debts: STSDebt[],
  startingCash: number,
  opts?: { today?: Date; income?: STSIncome[]; asOf?: string }
) {
  const result = computeSafeToSpend({
    income: opts?.income ?? income,
    bills,
    debts,
    goals: [],
    today: opts?.today ?? today,
  })
  return withStartingCash(result, { amount: startingCash, source: "checking", asOf: opts?.asOf ?? "2026-01-10" })
}

// The single property everything else is a variation on.
function assertSentenceHolds(snap: ReturnType<typeof buildPaycheckSnapshot>, label: string) {
  if (!snap) {
    assertTrue(false, `${label} -- expected a snapshot, got null`)
    return
  }
  assertTrue(snap.reconciles, `${label} -- reconciles`)
  const parts = snap.billsOut + snap.debtsOut + snap.transfersOut
  assertEqual(parts, snap.totalOut, `${label} -- parts sum to totalOut`)
  assertEqual(
    snap.onHand + snap.incoming - parts,
    snap.safeToSpend,
    `${label} -- onHand + incoming - out reproduces the headline`
  )
}

console.log("\nTest 1 -- a bill and a debt, split correctly and summing to the headline")
{
  const snap = buildPaycheckSnapshot(run([{ amount: 1500, due_date: 15 }], [{ minimum_payment: 800, due_date: 16 }], 4000))
  assertSentenceHolds(snap, "bill + debt")
  assertEqual(snap!.billsOut, 1500, "the bill lands in billsOut, not debtsOut")
  assertEqual(snap!.debtsOut, 800, "the debt payment lands in debtsOut")
  assertEqual(snap!.transfersOut, 0, "no transfers")
  assertEqual(snap!.safeToSpend, 1700, "headline is the engine's own 4000 - 1500 - 800")
}

console.log("\nTest 2 -- bills only, and debts only, do not leak into each other's line")
{
  const b = buildPaycheckSnapshot(run([{ amount: 1500, due_date: 15 }], [], 4000))
  assertSentenceHolds(b, "bills only")
  assertEqual(b!.billsOut, 1500, "billsOut carries it")
  assertEqual(b!.debtsOut, 0, "debtsOut stays zero")

  const d = buildPaycheckSnapshot(run([], [{ minimum_payment: 800, due_date: 16 }], 4000))
  assertSentenceHolds(d, "debts only")
  assertEqual(d!.debtsOut, 800, "debtsOut carries it")
  assertEqual(d!.billsOut, 0, "billsOut stays zero")
}

console.log("\nTest 3 -- a real shortfall is passed through, never clamped or hidden")
{
  const snap = buildPaycheckSnapshot(run([{ amount: 800, due_date: 15 }], [{ minimum_payment: 500, due_date: 16 }], 1000))
  assertSentenceHolds(snap, "shortfall")
  assertEqual(snap!.safeToSpend, -300, "-300 survives into the card's headline")
}

console.log("\nTest 4 -- nothing scheduled: today is the low point, so both totals are zero")
{
  // No bills, no debts. The balance never dips below what is on hand, so the
  // engine reports lowestDate null and lowestIdx -1. The snapshot must show a
  // clean "nothing between you and this number" rather than summing the whole
  // horizon's events.
  const snap = buildPaycheckSnapshot(run([], [], 4000))
  assertSentenceHolds(snap, "nothing scheduled")
  assertEqual(snap!.incoming, 0, "no income counted past the low point")
  assertEqual(snap!.totalOut, 0, "no outflow counted past the low point")
  assertEqual(snap!.safeToSpend, 4000, "safe to spend is simply what is on hand")
  assertTrue(snap!.lowestDate === null, "lowestDate is null when today is the tightest day")
}

console.log("\nTest 5 -- the boundary is the low point, NOT the end of the horizon")
{
  // A small bill inside the window and a very large one far out. The large one
  // is past the low point, so it must NOT appear in the breakdown -- if the
  // split walked every event instead of stopping at the engine's boundary,
  // billsOut would balloon and the sentence would stop reproducing safeToSpend.
  const snap = buildPaycheckSnapshot(
    run([{ amount: 200, due_date: 15 }], [], 4000)
  )
  assertSentenceHolds(snap, "boundary respected")
  assertTrue(
    snap!.totalOut <= 4000 + snap!.incoming,
    `outflow counted (${snap!.totalOut}) never exceeds what was available to spend`
  )
}

console.log("\nTest 6 -- no income, or income with no pay date, yields null rather than zeroes")
{
  const noIncome = buildPaycheckSnapshot(run([], [], 4000, { income: [] }))
  assertTrue(noIncome === null, "no income -> null, so the card can say so instead of showing $0")

  const noDate = buildPaycheckSnapshot(
    run([], [], 4000, { income: [{ amount: 2000, frequency: "biweekly", next_pay_date: null, income_type: null }] })
  )
  assertTrue(noDate === null, "income with no pay date -> null")
}

console.log("\nTest 7 -- the on-hand line reports where the money figure came from")
{
  const snap = buildPaycheckSnapshot(run([{ amount: 1500, due_date: 15 }], [], 4000))
  assertTrue(snap!.onHandSource === "checking", "source is the entered Checking balance, not the projected paycheck")
  assertEqual(snap!.onHand, 4000, "onHand is that balance")
  assertTrue(snap!.onHandAsOf === "2026-01-10", "and it carries the as-of date so the UI never implies a live feed")
}

console.log("\nTest 8 -- several bills and debts across the window all land on the right lines")
{
  const snap = buildPaycheckSnapshot(
    run(
      [
        { amount: 300, due_date: 12 },
        { amount: 450, due_date: 14 },
      ],
      [
        { minimum_payment: 200, due_date: 13 },
        { minimum_payment: 150, due_date: 16 },
      ],
      4000
    )
  )
  assertSentenceHolds(snap, "multiple items")
  assertEqual(snap!.billsOut, 750, "both bills summed on the bills line")
  assertEqual(snap!.debtsOut, 350, "both debt payments summed on the debts line")
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
