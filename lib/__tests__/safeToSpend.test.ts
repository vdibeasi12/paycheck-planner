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

// `asOf` is the date the starting balance was accurate as of. It defaults to
// today, which for most tests here is the simplest framing -- but it is a real
// input, not a formality: anything due on or before it is already inside that
// balance and is deliberately not subtracted again (see balanceAsOfISO in
// lib/paycheckCycles.ts). Test 7 below exercises both sides of that line.
function run(
  bills: STSBill[],
  debts: STSDebt[],
  startingCash: number,
  opts?: { today?: Date; income?: STSIncome[]; asOf?: string }
) {
  const result = computeSafeToSpend({ income: opts?.income ?? income, bills, debts, goals: [], today: opts?.today ?? today })
  return withStartingCash(result, { amount: startingCash, source: "checking", asOf: opts?.asOf ?? "2026-01-10" })
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

console.log("Test 5 (REVISED Sep 9 2026, Vince: \"subtract all bills for that month\") -- an")
console.log("  obligation due later in the SAME calendar month, even after the next paycheck,")
console.log("  IS deducted now -- this is the Avant/personal-loan fix itself")
{
  // Due the 25th -- after the Jan 17 paycheck, but still inside January.
  // Before this fix, a second paycheck landing before the 25th made this
  // look "covered" and the app never reserved it; that's exactly what let
  // Avant (due the 22nd) go missing from Safe to Spend for someone paid
  // twice a month. Reserved from day one of the window now, regardless of
  // how many paychecks land before it.
  const bill: STSBill = { amount: 300, due_date: 25 }
  const r = run([bill], [], 4000)
  assertEqual(r.billsDue, 300, "a bill due later this month is reserved even though a paycheck lands first")
  // REVISED Sep 10 2026 (Vince, live screenshot: "I am not negative on my
  // accounts"). This used to assert 3700 -- 4000 minus the bill, with the
  // $2,000 paycheck landing Jan 17 credited nowhere. That one-sided
  // subtraction is exactly what printed a negative Safe to Spend on an
  // account holding $3,353.13; see projectBalanceTimeline in
  // lib/paycheckCycles.ts. The bill is still reserved and still itemized
  // (billsDue above is unchanged), it just no longer reduces what's safe to
  // spend TODAY, because the balance never actually dips: 4000, then +2000
  // on the 17th, then -300 on the 25th. The low point over that whole run is
  // today's own 4000.
  assertEqual(r.safeToSpend, 4000, "balance never dips below today's 4000 -- a $2,000 paycheck lands 8 days before a $300 bill")
  assertTrue(r.lowestDate === null, "and nothing ahead is tighter than right now")

  // The companion case, and the reason this is a fix and not a loophole: make
  // the same later-month bill big enough that the paycheck can't absorb it
  // and it bites in full. $4,000 due the 25th against $2,000 biweekly:
  // 4000 -> +2000 (Jan 17) -> -4000 (Jan 25) = 2000. Deliberately sized to
  // stay solvent month over month, so what's being measured is the DIP and
  // not a plan that simply runs out of money -- the balance recovers to 4000
  // and repeats the same 2000 trough in February.
  const bigBill: STSBill = { amount: 4000, due_date: 25 }
  const big = run([bigBill], [], 4000)
  assertEqual(big.safeToSpend, 2000, "a later-month bill the paycheck can't absorb still pulls Safe to Spend down, by exactly the shortfall it creates")
  assertTrue(big.lowestDate === "2026-01-25", "and names the day it happens (got " + big.lowestDate + ")")
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

console.log("Test 7 (updated Sep 9 2026) -- a bill already due earlier THIS cycle, still unpaid,")
console.log("  IS reserved -- but one due before the last paycheck landed is not (that's the")
console.log("  PRIOR cycle's responsibility, and reserving it again would double-count it)")
{
  // Due the 5th -- before "today" (Jan 10) but AFTER the last paycheck
  // landed (Jan 3, projected backward from the Jan 17 next_pay_date). No
  // paid_through recorded, so as far as the app can tell this is still
  // unpaid real money that hasn't left the account yet. CRITICAL FIX (Sep 9
  // 2026, Vince, reviewing a live screenshot): this test used to assert
  // billsDue stayed 0 here, on the theory that anything already past its
  // due date was "assumed already paid out of the PRIOR paycheck" -- but
  // that's not what paid_through actually means, and the live bug this
  // caught (a $97.98 "isn't reserved above" warning next to a Safe to Spend
  // figure that hadn't reserved it) was Vince pointing out exactly this.
  //
  // REVISED Sep 10 2026 (Vince: "the water bill was already paid on 9-2...
  // I can't keep going back and forth telling you this was paid"). Whether a
  // past-due item should still be reserved depends on a variable neither
  // earlier answer used: WHEN the starting balance was taken. Here the
  // balance is dated Jan 4 -- before this bill's Jan 5 due date -- so the
  // money demonstrably had not left yet when that figure was read, and it
  // must still be reserved. That is the case this test has always been about.
  const bill: STSBill = { amount: 250, due_date: 5 }
  const r = run([bill], [], 4000, { asOf: "2026-01-04" })
  assertEqual(r.billsDue, 250, "due after the last paycheck, still unpaid -- reserved, not assumed paid")
  assertEqual(r.safeToSpend, 3750, "4000 - 250 = 3750")

  // The other side of that line, and the actual fix: the same bill against a
  // balance taken Jan 10, five days AFTER it came due. A balance read on the
  // 10th is already net of anything that left on the 5th -- subtracting it
  // again is a straight double-count, which is what drove Vince's Chime
  // account negative on paper (Meijer, Netflix and Anthropic all came due
  // before the Sep 9 balance he entered, and all three were charged twice).
  const settled = run([bill], [], 4000, { asOf: "2026-01-10" })
  assertEqual(settled.safeToSpend, 4000, "a bill that came due before the balance was taken is already inside it -- not deducted again")
  // Critically it is NOT silently dropped: it's reported so the UI can list
  // it, and so an item that genuinely went unpaid stays visible instead of
  // disappearing from the app entirely.
  assertEqual(settled.timeline?.assumedSettledTotal ?? -1, 250, "and it's surfaced as assumed-settled, not quietly discarded")
  assertTrue(
    settled.timeline?.assumedSettled.length === 1 && settled.timeline.assumedSettled[0].date === "2026-01-05",
    "listed with the occurrence date it was settled for"
  )

  // Due the 2nd -- before the last paycheck (Jan 3) even landed, so it was
  // already that PRIOR cycle's responsibility. Still correctly excluded:
  // this fix widens the window back to the last paycheck, not indefinitely.
  const priorCycleBill: STSBill = { amount: 90, due_date: 2 }
  const r2 = run([priorCycleBill], [], 4000)
  assertEqual(r2.billsDue, 0, "due before the last paycheck landed -- the prior cycle's obligation, not this one's")
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
  // REVISED Sep 10 2026: this used to assert 4000, because the old model only
  // ever looked at the transfer tied to the LAST paycheck (a one-day window
  // ending on lastPaycheckDate) and was blind to every future sweep. The
  // balance timeline puts scheduled transfers on the calendar like anything
  // else, so the $2,000 sweep landing Jan 17 is now visible: 4000, sweep out
  // (-2000) -> 2000, paycheck in (+2000) -> 4000. Same-day ordering applies
  // outflows first on purpose (see projectBalanceTimeline), so the low point
  // is that 2000. Still not double-subtracted -- the debt itself is excluded
  // (debtsDue 0 above); what's subtracted is the transfer that pays it, once.
  assertEqual(r.safeToSpend, 2000, "the sweep that pays this debt is real money leaving on the 17th, counted once")
  assertTrue(r.lowestDate === "2026-01-17", "on the day the sweep happens (got " + r.lowestDate + ")")
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

console.log("Test 13 (REVISED Sep 10 2026, Vince: \"there are three main bills that come")
console.log("  from this account car, personal loan, and mortgage. This must be removed from")
console.log("  safe to spend when you look at the full month\") -- 'Mark as paid' (paid_through)")
console.log("  settles THIS cycle's own occurrence, but now reserves the NEXT one immediately")
console.log("  instead of waiting for it to enter its own window")
{
  // Same mortgage as Test 12 (due the 1st, 15-day grace -> effectively due
  // Jan 16), but the user pays it themselves on Jan 2 -- well before the
  // grace deadline even arrives. "Mark as paid" (app/bills-debts/page.tsx)
  // records paid_through as the NOMINAL due date for the cycle just paid
  // (Jan 1), not the day it was actually paid.
  //
  // Before Sep 10 2026: this settled January's occurrence AND correctly
  // reserved nothing further that month -- fine for "what's still owed by
  // month-end," but Vince's live complaint was exactly this shape (a real
  // recurring debt on the account, quietly reserving $0 for a month just
  // because its specific occurrence was already marked paid). Now,
  // extendForNextOccurrence (see itemsDueInWindow) guarantees a debt whose
  // ONLY occurrence this window would have shown got paid_through'd away
  // still gets its very next real payment reserved -- so January reserves
  // February's payment early, exactly the "always hold back for car/loan/
  // mortgage" behavior Vince asked for.
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
  assertEqual(
    january.debtsDue,
    2220.86,
    "January's own occurrence is settled, but its next payment (Feb, effective Feb 16) is reserved right away instead of showing $0 for the month"
  )

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

console.log("Test 16 (REVISED Sep 10 2026, Vince: \"there are three main bills that come from")
console.log("  this account car, personal loan, and mortgage. This must be removed from safe")
console.log("  to spend when you look at the full month\") -- the full live reconciliation:")
console.log("  Avant and Xfinity Internet (both due the 22nd) plus, now, the mortgage's own")
console.log("  next payment (already settled for September, but not for October) are all")
console.log("  reserved -- not just the ones landing before month-end")
{
  // Vince's real Sep 4 2026 numbers -- pooled checking $3,678.30 (53rd
  // Checking $3,303.13 + Chime Checking $375.17), next paycheck Sep 16.
  // windowEndDate for "today" = Sep 4 is Sep 30 -- everything below due
  // through Sep 30 is reserved now, not just through the Sep 16 paycheck.
  const liveIncome: STSIncome[] = [{ amount: 2578.4, frequency: "biweekly", next_pay_date: "2026-09-16", income_type: null }]
  const liveBills: STSBill[] = [
    { amount: 24.99, due_date: 1, frequency: "monthly" }, // BitDefender -- due Sep 1, before the Sep 2 last paycheck, so it's the PRIOR cycle's obligation and stays excluded (see Test 7)
    { amount: 8.99, due_date: 6, frequency: "monthly" }, // Netflix
    { amount: 20.0, due_date: 7, frequency: "monthly" }, // Anthropic
    { amount: 201.54, due_date: 11, frequency: "bimonthly", bimonthly_parity: "odd" }, // Addison Water
    { amount: 20.0, due_date: 14, frequency: "monthly" }, // Vercel Pro
    { amount: 96.31, due_date: 22, frequency: "monthly" }, // Xfinity Internet -- still September, now reserved
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
  const avant: STSDebt = { minimum_payment: 507.61, due_date: 22, covered_by_transfer: false } // still September, now reserved

  const today = new Date("2026-09-04T00:00:00")
  const result = computeSafeToSpend({
    income: liveIncome,
    bills: liveBills,
    debts: [signatureVisa, capitalOneAuto, onityMortgage, avant],
    goals: [],
    today,
  })
  const live = withStartingCash(result, { amount: 3678.3, source: "checking", asOf: "2026-09-04" })
  assertEqual(live.billsDue, 346.84, "Netflix + Anthropic + Addison Water + Vercel Pro + Xfinity Internet = 346.84")
  assertEqual(
    live.debtsDue,
    3374.97,
    "Signature Visa + Capital One Auto + Avant + Onity Mortgage's next payment = 3,374.97 (September's own mortgage payment is already settled, but October's is reserved now)"
  )
  // REVISED Sep 10 2026 (Vince, live screenshot of 53rd Checking reading
  // -$21.84 on an account holding $3,353.13): this used to assert -43.51,
  // i.e. 3,678.30 - 346.84 - 3,374.97, subtracting nearly four weeks of
  // obligations from a balance while crediting none of the $2,578.40
  // paychecks landing Sep 16 and Sep 30 inside that same stretch. The
  // balance timeline (projectBalanceTimeline, lib/paycheckCycles.ts) walks
  // both sides of the calendar and reports the low point instead:
  //   3,678.30
  //   Sep 6  Netflix        -8.99   -> 3,669.31
  //   Sep 7  Anthropic     -20.00   -> 3,649.31
  //   Sep 11 Addison Water -201.54  -> 3,447.77
  //   Sep 14 Vercel/Visa    -70.00  -> 3,377.77
  //   Sep 15 Cap One Auto  -596.50  -> 2,781.27   <-- low point
  //   Sep 16 paycheck    +2,578.40  -> 5,359.67
  //   ...never lower again through the horizon, mortgage included
  // Worth noting what that low point is: $2,781.27 is the exact figure Vince
  // was reasoning about by hand on Sep 4 ("they will spend the full
  // $2,781.27 because it's marked safe to spend" -- see the header comment
  // in lib/debtPayoffSafety.ts). The engine now lands on the same number he
  // arrived at manually from the same data, which is the whole point.
  assertEqual(live.safeToSpend, 2781.27, "the low point of the projected balance -- Sep 15, right after Capital One Auto and right before the Sep 16 paycheck")
  assertTrue(live.lowestDate === "2026-09-15", "on Sep 15 (got " + live.lowestDate + ")")
  assertEqual(
    live.startingCash + live.incomeThroughLowest - live.outflowThroughLowest,
    live.safeToSpend,
    "and the card's own breakdown reproduces the headline exactly -- balance + in - out through the low point"
  )

  // Same root-cause lock-in as before: dropping Capital One Auto's payment
  // changes safeToSpend by exactly its $596.50 minimum payment, proving the
  // mechanism, not just that a number happened to change.
  const buggyResult = computeSafeToSpend({
    income: liveIncome,
    bills: liveBills,
    debts: [signatureVisa, onityMortgage, avant], // Capital One Auto missing entirely
    goals: [],
    today,
  })
  const buggy = withStartingCash(buggyResult, { amount: 3678.3, source: "checking", asOf: "2026-09-04" })
  // With Capital One Auto gone, the Sep 15 step disappears and the low point
  // moves back to Sep 14, right after Vercel + the Visa: $3,377.77. That is
  // the exact live buggy figure this whole line of fixes started from (see
  // Test 11's comment and CycleDebt.covered_by_transfer's "CRITICAL
  // CONSTRAINT"), which is a strong sign the projection is modeling the same
  // reality the old code was -- it just isn't dropping the income anymore.
  assertEqual(buggy.safeToSpend, 3377.77, "2,781.27 + 596.50 = 3,377.77 when Capital One Auto's payment is missing")
  assertEqual(
    buggy.safeToSpend - live.safeToSpend,
    596.5,
    "the gap is exactly Capital One Auto's minimum payment -- the mechanism, not a coincidence of numbers"
  )
}

console.log("Test 17 (REVISED Sep 10 2026) -- Safe to Spend and the Bills & Debts obligations")
console.log("  list (nextItemOccurrence) must still agree on WHICH occurrence is next for a")
console.log("  paid_through'd debt (October, not September) -- Safe to Spend just no longer")
console.log("  shows $0 for the month once it knows that, per Vince's Sep 10 2026 fix")
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
  assertEqual(
    stsResult.debtsDue,
    2220.86,
    "Safe to Spend agrees September's own occurrence is settled, but reserves October's payment right away instead of showing $0"
  )

  const nextOccurrence = nextItemOccurrence(onityMortgage, todayISO)
  assertTrue(
    nextOccurrence.status !== "grace" && nextOccurrence.status !== "overdue",
    `Next 7 Days must ALSO treat September as settled, not show 'grace'/'overdue' (got '${nextOccurrence.status}')`
  )
  assertEqual(nextOccurrence.occurrenceDate === null ? -1 : Number(nextOccurrence.occurrenceDate.slice(5, 7)), 10, "the next occurrence it finds is October's, not September's")
}

console.log("Test 18 (Sep 9 2026, Vince: \"don't calculate savings in safe to spend\") -- a goal")
console.log("  with a real, near-term deadline never reduces Safe to Spend, whether or not one")
console.log("  is passed in")
{
  const withGoal = computeSafeToSpend({
    income,
    bills: [],
    debts: [],
    goals: [{ target_amount: 10000, current_amount: 0, deadline: "2026-02-01", status: "active" }],
    today,
  })
  const withoutGoal = computeSafeToSpend({ income, bills: [], debts: [], goals: [], today })
  assertEqual(withGoal.safeToSpend, withoutGoal.safeToSpend, "an aggressive, near-term goal changes nothing")
  assertEqual(withGoal.safeToSpend, 2000, "just the starting cash (last paycheck, no goal deduction at all)")
}

console.log("Test 19 (Sep 9 2026, Vince: monthly window) -- the window correctly resets at the")
console.log("  calendar-month boundary: a bill due early NEXT month is not reserved yet, only one")
console.log("  due through the end of THIS month is")
{
  // Today Jan 25, last paycheck Jan 17, next paycheck Jan 31 -- windowEndDate
  // is also Jan 31. A bill due on the 3rd projects to Feb 3 from here (its
  // next occurrence after the Jan 17 last paycheck), which must stay OUT of
  // January's window even though the window now reaches all the way to
  // month-end.
  const lateMonthIncome: STSIncome[] = [{ amount: 2000, frequency: "biweekly", next_pay_date: "2026-01-17", income_type: null }]
  const nextMonthBill: STSBill = { amount: 400, due_date: 3 }
  const result = computeSafeToSpend({
    income: lateMonthIncome,
    bills: [nextMonthBill],
    debts: [],
    goals: [],
    today: new Date("2026-01-25T00:00:00"),
  })
  const r = withStartingCash(result, { amount: 4000, source: "checking", asOf: "2026-01-25" })
  assertEqual(r.billsDue, 0, "a bill whose next occurrence is next month stays out of this month's window")
  assertEqual(r.safeToSpend, 4000, "so it doesn't reduce this month's Safe to Spend yet")
  assertTrue(r.windowEndDate === "2026-01-31", `windowEndDate is the last day of the current calendar month (got ${r.windowEndDate})`)
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
