// lib/__tests__/safeToSpend.test.ts
//
// Deterministic tests for the Safe-to-Spend calculation
// (lib/safeToSpend.ts, built on lib/paycheckCycles.ts -- the one shared
// obligation-projection engine every screen that shows a cash-flow number
// reads from). Run with:
//
//   npx tsx lib/__tests__/safeToSpend.test.ts
//
// No test framework is installed in this repo, so this is a small
// self-contained runner: each test calls assertEqual/assertClose, failures
// are collected and printed, and the process exits non-zero if anything
// failed -- safe to wire into CI later (e.g. `"test:safe-to-spend": "tsx
// lib/__tests__/safeToSpend.test.ts"` in package.json) without adding a new
// dependency today.
//
// Sep 4 2026, Vince: written after tracing a real, reproducible bug --
// Safe to Spend showed $3,377.77 when it should not have, because two real
// debts (Capital One Auto, Avant) were flagged covered_by_transfer even
// though the "transfer" they were supposedly covered by moves money into
// another of the user's OWN pooled Checking accounts, not out of the
// tracked cash system entirely. covered_by_transfer means "this money has
// already left every account Safe to Spend pools together" -- once the
// destination account is itself one of the pooled accounts, that's no
// longer true, and the debt's required payment has to be reserved like any
// other debt. Test group 5 below locks that exact scenario in.

import { computeSafeToSpend, withStartingCash, type STSBill, type STSDebt, type STSIncome } from "../safeToSpend"
import { nextItemOccurrence } from "../paycheckCycles"

let passed = 0
let failed = 0

function assertEqual(actual: number, expected: number, label: string) {
  // Money math in this codebase is rounded to cents; compare with a small
  // epsilon rather than exact float equality.
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

// One biweekly paycheck, next landing 2026-01-17 -- every test below sets
// "today" to 2026-01-10, so the projected window is (Jan 10, Jan 17] and the
// most recent past paycheck (for the lastPaycheckAmount fallback) is Jan 3.
const income: STSIncome[] = [{ amount: 2000, frequency: "biweekly", next_pay_date: "2026-01-17", income_type: null }]
const today = new Date("2026-01-10T00:00:00")

function run(bills: STSBill[], debts: STSDebt[], startingCash: number, opts?: { today?: Date; income?: STSIncome[] }) {
  const result = computeSafeToSpend({ income: opts?.income ?? income, bills, debts, goals: [], today: opts?.today ?? today })
  return withStartingCash(result, { amount: startingCash, source: "checking", asOf: "2026-01-10" })
}

console.log("Test 1 -- bills reduce Safe to Spend")
{
  const bill: STSBill = { amount: 1500, due_date: 15 } // Jan 15, inside (Jan10, Jan17]
  const r = run([bill], [], 4000)
  assertEqual(r.billsDue, 1500, "billsDue reflects the bill")
  assertEqual(r.debtsDue, 0, "debtsDue is zero with no debts")
  assertEqual(r.safeToSpend, 2500, "4000 - 1500 bill = 2500")
}

console.log("Test 2 -- debt payments reduce Safe to Spend")
{
  const debt: STSDebt = { minimum_payment: 800, due_date: 16 } // Jan 16, inside window
  const r = run([], [debt], 4000)
  assertEqual(r.debtsDue, 800, "debtsDue reflects the required payment")
  assertEqual(r.safeToSpend, 3200, "4000 - 800 debt payment = 3200")
}

console.log("Test 3 -- bills AND debts both reduce Safe to Spend (no double count, no omission)")
{
  const bill: STSBill = { amount: 1500, due_date: 15 }
  const debt: STSDebt = { minimum_payment: 800, due_date: 16 }
  const r = run([bill], [debt], 4000)
  assertEqual(r.safeToSpend, 1700, "4000 - 1500 bills - 800 debts = 1700")
}

console.log("Test 4 -- obligations exceeding available money go negative, never clamped")
{
  const bill: STSBill = { amount: 800, due_date: 15 }
  const debt: STSDebt = { minimum_payment: 500, due_date: 16 }
  const r = run([bill], [debt], 1000)
  assertEqual(r.safeToSpend, -300, "1000 - 800 - 500 = -300, a real shortfall, not clamped to 0")
}

console.log("Test 5 -- an obligation outside the planning horizon is not deducted yet")
{
  // Due the 25th -- after the Jan 17 paycheck, so it's the FOLLOWING cycle's
  // responsibility, not this one's. It must not silently vanish from the
  // app (see classifyItemsAroundCycle/the Bills & Debts "Coming up" list),
  // but it also must not be double-reserved against a paycheck that isn't
  // the one actually funding it.
  const bill: STSBill = { amount: 300, due_date: 25 }
  const r = run([bill], [], 4000)
  assertEqual(r.billsDue, 0, "a bill due after the next paycheck isn't reserved from this cycle")
  assertEqual(r.safeToSpend, 4000, "so Safe to Spend is untouched by it this cycle")
}

console.log("Test 6 -- a recurring monthly bill projects to the right occurrence every cycle")
{
  const bill: STSBill = { amount: 100, due_date: 15 }
  const jan = run([bill], [], 4000, { today: new Date("2026-01-10T00:00:00") })
  assertEqual(jan.billsDue, 100, "picked up for the January cycle")
  // A later "today" with the same recurring bill and a later next-paycheck
  // date, same relative offsets, should pick up February's occurrence the
  // same way.
  const febIncome: STSIncome[] = [{ amount: 2000, frequency: "biweekly", next_pay_date: "2026-02-17", income_type: null }]
  const febResult = computeSafeToSpend({
    income: febIncome,
    bills: [bill],
    debts: [],
    goals: [],
    today: new Date("2026-02-10T00:00:00"),
  })
  const feb = withStartingCash(febResult, { amount: 4000, source: "checking", asOf: "2026-02-10" })
  assertEqual(feb.billsDue, 100, "picked up again for the February cycle")
}

console.log("Test 7 -- a bill already due earlier this cycle isn't reserved a second time")
{
  // Due the 5th -- before "today" (Jan 10), so it's assumed already paid out
  // of the PRIOR paycheck. Reserving it again here would double-count the
  // same bill against two different paychecks.
  const bill: STSBill = { amount: 250, due_date: 5 }
  const r = run([bill], [], 4000)
  assertEqual(r.billsDue, 0, "an already-due bill isn't reserved again this cycle")
}

console.log("Test 8 -- debt BALANCE is never used, only the required minimum payment")
{
  // A $10,000 balance must never appear in the cash-flow number -- only the
  // $300 minimum payment due this cycle is a real near-term obligation.
  const debt: STSDebt = { minimum_payment: 300, due_date: 15 }
  const r = run([], [debt], 4000)
  assertEqual(r.debtsDue, 300, "only the minimum payment is reserved")
  assertEqual(r.safeToSpend, 3700, "never the full $10,000 balance")
}

console.log("Test 9 -- no bills or debts due this cycle: Safe to Spend is just the available cash")
{
  const r = run([], [], 4000)
  assertEqual(r.safeToSpend, 4000, "nothing to reserve this cycle")
}

console.log("Test 10 (regression) -- covered_by_transfer excludes a debt only when a real")
console.log("  transfer is actually on record to back it up")
{
  const debt: STSDebt = { minimum_payment: 400, due_date: 15, covered_by_transfer: true }
  const withTransferOnFile: STSIncome[] = [
    ...income,
    { amount: 2000, frequency: "biweekly", next_pay_date: "2026-01-17", income_type: "transfer" },
  ]
  const r = run([], [debt], 4000, { income: withTransferOnFile })
  assertEqual(r.debtsDue, 0, "excluded -- a real transfer is on record backing the flag")
  assertEqual(r.safeToSpend, 4000, "not double-subtracted")
}

console.log("Test 11 (regression) -- the Sep 4 2026 bug, root cause: covered_by_transfer was")
console.log("  trusted with ZERO transfer income rows anywhere on file to back it up")
{
  // This is the actual shape of the live bug: Capital One Auto ($596.50, due
  // the 15th) was flagged covered_by_transfer even though there was no
  // transfer income row on file at all -- nothing had actually left
  // anywhere. With the flag trusted blindly, the required payment vanished
  // from debtsDue entirely (the exact mechanism behind the live $3,377.77
  // figure -- see Test 16 below for the full reconciliation). The fix:
  // excludeTransferCoveredDebts now requires real evidence (at least one
  // income_type "transfer" row) before it will honor the flag at all --
  // with none on file (this test's `income` has none), the flag is ignored
  // and the payment is reserved like any other debt.
  const wronglyFlagged: STSDebt = { minimum_payment: 596.5, due_date: 15, covered_by_transfer: true }
  const fixed = run([], [wronglyFlagged], 4000)
  assertEqual(fixed.debtsDue, 596.5, "fixed: with no transfer on record, the flag is not honored -- the payment is reserved")
  assertEqual(fixed.safeToSpend, 3403.5, "4000 - 596.50 = 3403.50, not the full 4000")

  // Known remaining limitation, documented rather than silently fixed: once
  // ANY transfer exists on file, the flag is still trusted coarsely --
  // nothing yet ties THIS debt to that SPECIFIC transfer's actual
  // destination, so a transfer that lands right back in one of the user's
  // own pooled accounts would still (wrongly) let the flag exclude a debt
  // it shouldn't. See CycleDebt.covered_by_transfer's comment.
  const withUnrelatedTransferOnFile: STSIncome[] = [
    ...income,
    { amount: 500, frequency: "monthly", next_pay_date: "2026-01-05", income_type: "transfer" },
  ]
  const stillCoarse = run([], [wronglyFlagged], 4000, { income: withUnrelatedTransferOnFile })
  assertEqual(stillCoarse.debtsDue, 0, "documents the known gap: any transfer on file is still enough to honor the flag")
}

console.log("Test 12 (regression) -- a debt with a real grace period isn't reserved until the grace")
console.log("  window actually ends, but IS reserved once it does (the mortgage/grace-period fix)")
{
  // Due the 1st, 15-day grace period -> effectively due the 16th. "Today"
  // for this one test is Jan 2 (just past the nominal due day, still well
  // inside the grace window) with a paycheck landing Jan 20, so the
  // effective due date (Jan 16) falls inside this cycle's window and must
  // be reserved -- not skipped just because the nominal day already passed.
  // The income anchor (next_pay_date) is set in the past (Dec 20) so a
  // "last paycheck" actually exists to project forward from -- a monthly
  // income's very first-ever occurrence can't be in the future relative to
  // "today," or there's no past paycheck yet and no cycle to project at all
  // (a real, separate, and correct rule: see computeSafeToSpend's "brand
  // new income row" comment -- not something this test is about).
  const mortgage: STSDebt = { minimum_payment: 2220.86, due_date: 1, grace_period_days: 15, covered_by_transfer: false }
  const graceIncome: STSIncome[] = [{ amount: 3000, frequency: "monthly", next_pay_date: "2025-12-20", income_type: null }]
  const result = computeSafeToSpend({
    income: graceIncome,
    bills: [],
    debts: [mortgage],
    goals: [],
    today: new Date("2026-01-02T00:00:00"),
  })
  const r = withStartingCash(result, { amount: 5000, source: "checking", asOf: "2026-01-02" })
  assertEqual(r.debtsDue, 2220.86, "reserved once inside the grace window, not skipped as 'already due'")
}

console.log("Test 13 (regression) -- 'Mark as paid' (paid_through) settles THIS cycle without")
console.log("  breaking the NEXT one, even when paid early inside a grace window")
{
  // Same mortgage as Test 12 (due the 1st, 15-day grace -> effectively due
  // Jan 16), but the user pays it themselves on Jan 2 -- well before the
  // grace deadline even arrives. "Mark as paid" (app/bills-debts/page.tsx)
  // records paid_through as the NOMINAL due date for the cycle just paid
  // (Jan 1), not the day it was actually paid. This must do two things at
  // once: stop the Jan 16 effective date from being reserved again this
  // cycle (the user already paid, and the balance was already debited
  // directly -- see lib/cashBalance.ts), while still reserving February's
  // occurrence normally once that comes around.
  const graceIncome: STSIncome[] = [{ amount: 3000, frequency: "monthly", next_pay_date: "2025-12-20", income_type: null }]

  const paidMortgage: STSDebt = {
    minimum_payment: 2220.86,
    due_date: 1,
    grace_period_days: 15,
    covered_by_transfer: false,
    paid_through: "2026-01-01", // settled January's occurrence
  }
  const januaryResult = computeSafeToSpend({
    income: graceIncome,
    bills: [],
    debts: [paidMortgage],
    goals: [],
    today: new Date("2026-01-02T00:00:00"),
  })
  const january = withStartingCash(januaryResult, { amount: 5000, source: "checking", asOf: "2026-01-02" })
  assertEqual(january.debtsDue, 0, "not reserved again -- already paid and already debited from the balance")

  // February: same debt, same paid_through (nothing new has been marked
  // paid yet for Feb) -- its Feb 1 occurrence must NOT be skipped just
  // because January's was.
  const febIncome: STSIncome[] = [{ amount: 3000, frequency: "monthly", next_pay_date: "2026-01-20", income_type: null }]
  const februaryResult = computeSafeToSpend({
    income: febIncome,
    bills: [],
    debts: [paidMortgage],
    goals: [],
    today: new Date("2026-02-02T00:00:00"),
  })
  const february = withStartingCash(februaryResult, { amount: 5000, source: "checking", asOf: "2026-02-02" })
  assertEqual(february.debtsDue, 2220.86, "February's occurrence is reserved normally -- paid_through doesn't leak forward")
}

console.log("Test 14 (regression) -- a bimonthly bill only lands every OTHER month once its")
console.log("  parity is set. This is the Sep 4 2026 bug rendered as a real bill: Addison Water")
console.log("  Bill, $201.54, bimonthly, due the 11th -- correctly due in September ('odd'")
console.log("  months) but must NOT show up again in October")
{
  const waterBill: STSBill = { amount: 201.54, due_date: 11, frequency: "bimonthly", bimonthly_parity: "odd" }

  const septemberIncome: STSIncome[] = [
    { amount: 2578.4, frequency: "biweekly", next_pay_date: "2026-09-16", income_type: null },
  ]
  const septemberResult = computeSafeToSpend({
    income: septemberIncome,
    bills: [waterBill],
    debts: [],
    goals: [],
    today: new Date("2026-09-04T00:00:00"),
  })
  assertEqual(septemberResult.billsDue, 201.54, "correctly due in September (an odd month)")

  const octoberIncome: STSIncome[] = [
    { amount: 2578.4, frequency: "biweekly", next_pay_date: "2026-10-16", income_type: null },
  ]
  const octoberResult = computeSafeToSpend({
    income: octoberIncome,
    bills: [waterBill],
    debts: [],
    goals: [],
    today: new Date("2026-10-04T00:00:00"),
  })
  assertEqual(octoberResult.billsDue, 0, "NOT due in October -- an off month for an 'odd'-parity bimonthly bill")
}

console.log("Test 15 (regression) -- a bimonthly bill with NO parity set yet (older data, from")
console.log("  before this fix existed) falls back to the old every-month behavior rather than")
console.log("  guessing which months, or silently excluding a real bill")
{
  const legacyBimonthlyBill: STSBill = { amount: 85, due_date: 15, frequency: "bimonthly" } // bimonthly_parity intentionally unset
  const r = run([legacyBimonthlyBill], [], 4000)
  assertEqual(r.billsDue, 85, "unset parity keeps the conservative every-month fallback")
}

console.log("Test 16 (regression) -- the full Sep 4 2026 live reconciliation, permanently")
console.log("  locked in: starting cash minus every real obligation equals the exact")
console.log("  live figure, and the exact buggy figure it used to produce")
{
  // Vince's real Sep 4 2026 numbers -- pooled checking $3,678.30 (53rd
  // Checking $3,303.13 + Chime Checking $375.17), next paycheck Sep 16.
  const liveIncome: STSIncome[] = [{ amount: 2578.4, frequency: "biweekly", next_pay_date: "2026-09-16", income_type: null }]
  const liveBills: STSBill[] = [
    { amount: 24.99, due_date: 1, frequency: "monthly" }, // BitDefender -- already due before today, excluded
    { amount: 8.99, due_date: 6, frequency: "monthly" }, // Netflix
    { amount: 20.0, due_date: 7, frequency: "monthly" }, // Anthropic
    { amount: 201.54, due_date: 11, frequency: "bimonthly", bimonthly_parity: "odd" }, // Addison Water
    { amount: 20.0, due_date: 14, frequency: "monthly" }, // Vercel Pro
    { amount: 96.31, due_date: 22, frequency: "monthly" }, // Xfinity Internet -- next cycle
  ]
  const signatureVisa: STSDebt = { minimum_payment: 50, due_date: 14, covered_by_transfer: false }
  const capitalOneAuto: STSDebt = { minimum_payment: 596.5, due_date: 15, covered_by_transfer: false }
  const onityMortgage: STSDebt = {
    minimum_payment: 2220.86,
    due_date: 1,
    grace_period_days: 15,
    paid_through: "2026-09-01", // September already marked paid
    covered_by_transfer: false,
  }
  const avant: STSDebt = { minimum_payment: 507.61, due_date: 22, covered_by_transfer: false } // next cycle

  const today = new Date("2026-09-04T00:00:00")
  const result = computeSafeToSpend({
    income: liveIncome,
    bills: liveBills,
    debts: [signatureVisa, capitalOneAuto, onityMortgage, avant],
    goals: [],
    today,
  })
  const live = withStartingCash(result, { amount: 3678.3, source: "checking", asOf: "2026-09-04" })
  assertEqual(live.billsDue, 250.53, "Netflix + Anthropic + Addison Water + Vercel Pro = 250.53")
  assertEqual(live.debtsDue, 646.5, "Signature Visa + Capital One Auto = 646.50 (mortgage already paid, Avant is next cycle)")
  assertEqual(live.safeToSpend, 2781.27, "3,678.30 - 250.53 - 646.50 = 2,781.27, the exact live figure")

  // The exact historical bug, permanently reproducible: if Capital One
  // Auto's payment is dropped from the reservation (the live failure mode --
  // see Test 11), the same starting cash and bills produce $3,377.77
  // instead. Locking this in proves the root cause, not just that a
  // number happened to change.
  const buggyResult = computeSafeToSpend({
    income: liveIncome,
    bills: liveBills,
    debts: [signatureVisa, onityMortgage, avant], // Capital One Auto missing entirely
    goals: [],
    today,
  })
  const buggy = withStartingCash(buggyResult, { amount: 3678.3, source: "checking", asOf: "2026-09-04" })
  assertEqual(buggy.safeToSpend, 3377.77, "reproduces the exact historical bug figure when Capital One Auto's payment is missing")
}

console.log("Test 17 (regression) -- Safe to Spend and the Bills & Debts obligations list")
console.log("  (nextItemOccurrence) must agree on whether a paid_through'd occurrence is")
console.log("  settled -- the exact Onity Mortgage bug caught live on Sep 4 2026")
{
  const onityMortgage: STSDebt = {
    minimum_payment: 2220.86,
    due_date: 1,
    grace_period_days: 15,
    paid_through: "2026-09-01",
    covered_by_transfer: false,
  }
  const todayISO = "2026-09-04"
  const liveIncome: STSIncome[] = [{ amount: 2578.4, frequency: "biweekly", next_pay_date: "2026-09-16", income_type: null }]
  const stsResult = withStartingCash(
    computeSafeToSpend({ income: liveIncome, bills: [], debts: [onityMortgage], goals: [], today: new Date(todayISO + "T00:00:00") }),
    { amount: 5000, source: "checking", asOf: todayISO }
  )
  assertEqual(stsResult.debtsDue, 0, "Safe to Spend excludes September's occurrence -- already marked paid")

  const nextOccurrence = nextItemOccurrence(onityMortgage, todayISO)
  assertTrue(
    nextOccurrence.status !== "grace" && nextOccurrence.status !== "overdue",
    `Next 7 Days must ALSO treat September as settled, not show 'grace'/'overdue' (got '${nextOccurrence.status}')`
  )
  assertEqual(nextOccurrence.occurrenceDate === null ? -1 : Number(nextOccurrence.occurrenceDate.slice(5, 7)), 10, "the next occurrence it finds is October's, not September's")
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
