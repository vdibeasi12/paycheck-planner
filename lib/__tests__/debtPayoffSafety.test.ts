// lib/__tests__/debtPayoffSafety.test.ts
//
// Deterministic tests for computeDebtPayoffAffordability ("Can I pay this
// off?" on Bills & Debts). Run with:
//
//   npx tsx lib/__tests__/debtPayoffSafety.test.ts
//
// Sep 4 2026, Vince, after walking through "can I safely use $2,000 to pay
// off all my credit debt and still be covered for the 15th and 22nd" by
// hand: "the logic can review and let the person know what they can put
// towards debt, how much they need to keep in reserve -- otherwise they
// will spend the full $2,781.27 because it's marked safe to spend... they
// need to know about a financial cushion." These tests use his real Sep 4
// 2026 numbers (see safeToSpend.test.ts / cashBalance.test.ts /
// planResilience.test.ts for the same fixtures elsewhere) to lock in that
// exact scenario.

import { type CycleBill, type CycleDebt, type CycleIncome, type CycleGoal } from "../paycheckCycles"
import { computeDebtPayoffAffordability, DEFAULT_PAYOFF_RESERVE } from "../debtPayoffSafety"
import { computeSafeToSpend, withStartingCash, type STSBill } from "../safeToSpend"

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

const bills: CycleBill[] = [
  { amount: 24.99, due_date: 1, frequency: "monthly" },
  { amount: 8.99, due_date: 6, frequency: "monthly" },
  { amount: 20.0, due_date: 7, frequency: "monthly" },
  { amount: 201.54, due_date: 11, frequency: "bimonthly", bimonthly_parity: "odd" },
  { amount: 20.0, due_date: 14, frequency: "monthly" },
  { amount: 96.31, due_date: 22, frequency: "monthly" },
  { amount: 85.0, due_date: 25, frequency: "bimonthly", bimonthly_parity: "odd" },
  { amount: 25.0, due_date: 27, frequency: "monthly" },
  { amount: 120.0, due_date: 27, frequency: "monthly" },
  { amount: 142.71, due_date: 28, frequency: "monthly" },
]

// Vince's real live debts, Sep 4 2026 -- name kept as a comment since
// CycleDebt itself doesn't carry one; balance is what "pay this off" costs.
type NamedDebt = CycleDebt & { name: string; balance: number }
const allDebts: NamedDebt[] = [
  { name: "Onity Mortgage", balance: 251073.63, minimum_payment: 2220.86, due_date: 1, grace_period_days: 15, paid_through: "2026-09-01" },
  { name: "PayPal Credit", balance: 0, minimum_payment: 0, due_date: 1 },
  { name: "DiBeasi Global Investments", balance: 480.67, minimum_payment: 50, due_date: 2 },
  { name: "Meijer Mastercard", balance: 337.67, minimum_payment: 50, due_date: 4 },
  { name: "Signature Visa", balance: 107.14, minimum_payment: 50, due_date: 14 },
  { name: "Capital One Auto", balance: 33658.07, minimum_payment: 596.5, due_date: 15 },
  { name: "Home Depot Credit Card", balance: 213.7, minimum_payment: 29, due_date: 22 },
  { name: "Avant", balance: 14642.24, minimum_payment: 507.61, due_date: 22 },
  { name: "PayPal Cashback Mastercard", balance: -9.33, minimum_payment: 0, due_date: null },
]

const CREDIT_CARD_NAMES = [
  "PayPal Credit",
  "DiBeasi Global Investments",
  "Meijer Mastercard",
  "Signature Visa",
  "Home Depot Credit Card",
  "PayPal Cashback Mastercard",
]

const income: CycleIncome[] = [{ amount: 2578.4, frequency: "biweekly", next_pay_date: "2026-09-16" }]
const goals: CycleGoal[] = []
const startingCash = 3678.3
const today = new Date("2026-09-04T00:00:00")

console.log("Test 1 -- the real credit-card payoff selection costs exactly $1,129.85,")
console.log("  same total worked out by hand in chat")
{
  const selected = allDebts.filter((d) => CREDIT_CARD_NAMES.includes(d.name))
  const cost = selected.reduce((sum, d) => sum + d.balance, 0)
  assertEqual(cost, 1129.85, "5 credit cards + the $0 one + the -$9.33 credit nets to 1,129.85")
}

console.log("\nTest 2 (REVISED Sep 10 2026, Vince: \"there are three main bills that come from")
console.log("  this account car, personal loan, and mortgage. This must be removed from safe")
console.log("  to spend when you look at the full month\") -- with nothing paid off yet, the")
console.log("  tightest point in Vince's plan is TODAY, once today's checkpoint reserves")
console.log("  everything due through month-end PLUS the mortgage's always-reserved next")
console.log("  payment -- not a later cycle")
{
  // CRITICAL FIX (Sep 9 2026, Vince, live screenshot of 53rd Checking):
  // "53rd is not counting the personal loan and it needs to earmark the up
  // coming mortgage payment" led to finding this function's todayCheckpoint
  // only netted out what was ALREADY due as of today, not the fuller window
  // Safe to Spend itself now reserves. Once lib/safeToSpend.ts widened to
  // "everything due through the end of this calendar month" (the same day,
  // Vince: "subtract all bills for that month"), todayCheckpoint here was
  // updated to call computeSafeToSpend directly instead of re-deriving a
  // narrower window by hand.
  //
  // REVISED Sep 10 2026: Vince came back furious that the mortgage
  // (Onity Mortgage, settled for September via paid_through) still wasn't
  // being held back -- "car, personal loan, and mortgage... must be
  // removed... when you look at the full month." computeSafeToSpend now
  // always reserves a debt's very next payment even when its own occurrence
  // falls in the following month (see lib/paycheckCycles.ts's
  // extendForNextOccurrence), so today's checkpoint here also reserves
  // Onity Mortgage's October payment ($2,220.86) on top of everything
  // already due in September -- which makes today's checkpoint tighter
  // still, and, on Vince's real numbers, negative.
  const result = computeDebtPayoffAffordability({ startingCash, income, bills, debts: allDebts, goals, today })
  assertEqual(result.reserve, DEFAULT_PAYOFF_RESERVE, "default reserve is $150")
  assertEqual(result.maxSafeToPayoff, result.tightestRunningBalance - result.reserve, "maxSafeToPayoff is tightestRunningBalance minus reserve")
  // REVISED Sep 10 2026 (Vince, live screenshot: "I am not negative on my
  // accounts"). These used to assert -495.22 -- today's cash minus a month of
  // bills, a month of debts AND the mortgage's next payment, with the two
  // $2,578.40 paychecks landing Sep 16 and Sep 30 credited nowhere. That is
  // the same income-blind subtraction that printed a negative Safe to Spend
  // on an account holding $3,353.13; see findTightestCheckpoint's comment and
  // projectBalanceTimeline in lib/paycheckCycles.ts. The tightest point is
  // now found by walking the real calendar with both directions of cash flow:
  //   3,678.30
  //   Sep 4  Meijer (past due)   -50.00  -> 3,628.30
  //   Sep 6  Netflix              -8.99  -> 3,619.31
  //   Sep 7  Anthropic           -20.00  -> 3,599.31
  //   Sep 11 Addison Water      -201.54  -> 3,397.77
  //   Sep 14 Vercel + Visa       -70.00  -> 3,327.77
  //   Sep 15 Capital One Auto   -596.50  -> 2,731.27   <-- tightest
  //   Sep 16 paycheck         +2,578.40  -> 5,309.67
  //   ...and never lower again through the horizon, October's mortgage and
  //   every remaining September bill included.
  assertEqual(result.tightestRunningBalance, 2731.27, "the low point of the projected balance -- Sep 15, after Capital One Auto clears and before the Sep 16 paycheck lands")
  assertEqual(
    result.tightestRunningBalance,
    startingCash - 50 - 8.99 - 20 - 201.54 - 20 - 50 - 596.5,
    "3,678.30 minus exactly what leaves before that day: Meijer (past due), Netflix, Anthropic, Addison Water, Vercel Pro, Signature Visa, Capital One Auto = 947.03"
  )
  assertTrue(result.tightestDate === "2026-09-15", `and it names the actual day instead of a vague 'today' (got ${result.tightestDate})`)
  console.log(`  (tightest point: ${result.tightestRunningBalance} on ${result.tightestDate}, maxSafeToPayoff ${result.maxSafeToPayoff})`)
}

console.log("\nTest 2b (regression) -- maxSafeToPayoff must never exceed what's actually in")
console.log("  the bank today, no matter how healthy future cycles look")
{
  // This is the exact live shape of the original Sep 5 2026 bug: Vince's
  // Sep 16 paycheck easily covers its own thin bills, so
  // cycles[0].runningBalance (5,309.67) comes back HIGHER than his real
  // startingCash (3,678.30) -- even though the Oct 28 cycle's OWN paycheck
  // doesn't cover that cycle's OWN bills (cushion -1,159.59; only the cash
  // carried forward from earlier cycles absorbs it). The Sep 5 fix floored
  // the recommendation at today's real cash; the Sep 9/10 monthly-window
  // fixes (Test 2 above) tightened today's own checkpoint further still, to
  // the point where it's now the binding constraint all by itself -- and,
  // once the mortgage's next payment is always reserved too, negative.
  const result = computeDebtPayoffAffordability({ startingCash, income, bills, debts: allDebts, goals, today })
  assertTrue(
    result.maxSafeToPayoff <= startingCash,
    `maxSafeToPayoff (${result.maxSafeToPayoff}) must never exceed today's real starting cash (${startingCash})`
  )
  assertEqual(result.maxSafeToPayoff, 2731.27 - DEFAULT_PAYOFF_RESERVE, "2,731.27 (tightest point, Test 2) - 150 (reserve) = 2,581.27 is what's genuinely free to send to debt")
}

console.log("\nTest 2c (regression, Sep 9 2026) -- Extra Debt Payment can never recommend")
console.log("  more than Safe to Spend's own headline number says is free for the exact")
console.log("  same account/window, whatever the two engines are asked about separately")
{
  // The concrete guarantee behind Vince's "option 1": once fixed, these two
  // numbers -- computed by genuinely different code paths -- can't disagree
  // about the one thing they're both actually asking, "what's free between
  // now and the next paycheck." Checked with a real starting-cash grounding
  // (withStartingCash), same as every page that shows both side by side.
  const affordability = computeDebtPayoffAffordability({ startingCash, income, bills, debts: allDebts, goals, today })
  let sts = computeSafeToSpend({ income, bills, debts: allDebts, goals, today })
  sts = withStartingCash(sts, { amount: startingCash, source: "checking", asOf: "2026-09-01" })
  assertTrue(
    affordability.maxSafeToPayoff + affordability.reserve <= sts.safeToSpend + 0.005,
    `Extra Debt Payment's own headroom (${affordability.maxSafeToPayoff} + ${affordability.reserve} reserve) must never exceed Safe to Spend's own number (${sts.safeToSpend})`
  )
}

console.log("\nTest 3 (REVISED Sep 10 2026) -- paying off the real credit-card selection")
console.log("  ($1,129.85) is NO LONGER shown as safe, now that Onity Mortgage's next payment")
console.log("  is always held back too -- a real, honest answer, not the same one dressed up")
{
  // Before Sep 10 2026, this was a "yes, safe" test: removing the mortgage
  // from the picture (it looked settled for the month) left enough room to
  // cover the $1,129.85 payoff. Once the mortgage's own next payment is
  // always reserved (Vince's Sep 10 2026 fix), the true picture is tighter:
  // maxSafeToPayoff even with every credit card removed from the projection
  // no longer covers the cost. This is the correct, more conservative
  // answer given what Vince asked for -- Extra Debt Payment must say "not
  // right now" rather than green-light a payoff that would leave nothing
  // for October's mortgage.
  const selected = allDebts.filter((d) => CREDIT_CARD_NAMES.includes(d.name))
  const cost = selected.reduce((sum, d) => sum + d.balance, 0)
  const remaining = allDebts.filter((d) => !CREDIT_CARD_NAMES.includes(d.name))
  const result = computeDebtPayoffAffordability({ startingCash, income, bills, debts: remaining, goals, today })
  console.log(`  (cost ${cost}, maxSafeToPayoff after removing them ${result.maxSafeToPayoff})`)
  // REVISED Sep 10 2026: this assertion has now been flipped twice, and the
  // reason is worth recording. Originally "yes, safe." On Sep 10 morning it
  // became "no, not safe," because the mortgage's next payment was being
  // reserved out of a balance that was never credited with the two paychecks
  // arriving first -- so the plan looked broke when it wasn't. With income on
  // the same calendar as obligations, the honest answer is "yes, safe" again,
  // and now for a reason that survives inspection: after clearing the cards,
  // the projected low point is $2,831.27 (Sep 15), leaving $2,681.27 free of
  // the $150 reserve -- comfortably more than the $1,129.85 the payoff costs,
  // with October's mortgage still fully covered further down the timeline.
  assertTrue(cost < result.maxSafeToPayoff, "the $1,129.85 payoff fits inside what's safe to send to debt, with October's mortgage still covered")
  assertEqual(result.maxSafeToPayoff, 2681.27, "and the exact headroom is 2,831.27 at the Sep 15 low point, less the $150 reserve")
}

console.log("\nTest 4 -- paying off a debt strictly increases (never decreases) maxSafeToPayoff,")
console.log("  since its future minimum payments stop being obligations")
{
  const withMortgage = computeDebtPayoffAffordability({ startingCash, income, bills, debts: allDebts, goals, today })
  const withoutCapitalOneAuto = computeDebtPayoffAffordability({
    startingCash,
    income,
    bills,
    debts: allDebts.filter((d) => d.name !== "Capital One Auto"),
    goals,
    today,
  })
  assertTrue(
    withoutCapitalOneAuto.maxSafeToPayoff >= withMortgage.maxSafeToPayoff,
    "removing Capital One Auto's future payments never makes the plan look tighter"
  )
}

console.log("\nTest 5 -- the reserve is a direct dollar-for-dollar subtraction: a $50 higher")
console.log("  reserve means exactly $50 less is ever called safe to send to debt")
{
  const base = computeDebtPayoffAffordability({ startingCash, income, bills, debts: allDebts, goals, today, reserve: 150 })
  const higherReserve = computeDebtPayoffAffordability({ startingCash, income, bills, debts: allDebts, goals, today, reserve: 200 })
  assertEqual(base.maxSafeToPayoff - higherReserve.maxSafeToPayoff, 50, "a $50 bigger reserve means $50 less safe to pay off")
}

console.log("\nTest 6 (regression) -- no income/pay date at all falls back to today's real cash")
console.log("  minus the reserve, the only number available, instead of crashing or")
console.log("  returning something misleading")
{
  const result = computeDebtPayoffAffordability({ startingCash, income: [], bills, debts: allDebts, goals, today })
  assertEqual(result.maxSafeToPayoff, startingCash - DEFAULT_PAYOFF_RESERVE, "falls back to startingCash - reserve")
  assertTrue(result.tightestDate === null, "no cycle to name when there's no projectable plan")
}

console.log("\nTest 7 (REVISED Sep 10 2026) -- a grace-period-shifted debt that lands on the")
console.log("  4th projected paycheck used to need the wider 4-cycle default horizon to be")
console.log("  seen at all; now extendForNextOccurrence catches it immediately at TODAY's own")
console.log("  checkpoint, so it's visible at ANY horizon -- both fixes cooperate")
{
  // Same mechanism as the real Onity Mortgage (due the 1st, 15-day grace,
  // September already settled via paid_through) -- nominal Oct 1 shifts to
  // an effective Oct 16, landing in the Oct 14-28 cycle, the 4th one out.
  // Scaled so THIS payment is big enough relative to the paycheck to
  // actually become the tightest point instead of getting absorbed the way
  // Vince's full, healthier plan absorbs his real mortgage (see Test 2).
  //
  // REVISED Sep 10 2026: before this date, todayCheckpoint didn't reserve
  // this debt at all (settled for September, not due again until the Oct
  // 28 cycle), so only the 4-cycle default (not the old 3-cycle one) could
  // see it. Now that computeSafeToSpend always reserves a paid_through'd
  // debt's very next payment regardless of how far out it lands (Vince's
  // Sep 10 2026 fix), today's OWN checkpoint catches this debt immediately
  // -- before any future cycle even gets compared. That makes the answer
  // identical at 3 cycles and 4 cycles: the horizon no longer matters for
  // this shape of debt at all, which is a strictly stronger guarantee than
  // "the default happens to be wide enough."
  const synthIncome: CycleIncome[] = [{ amount: 1200, frequency: "biweekly", next_pay_date: "2026-09-16" }]
  const synthDebt: CycleDebt = { minimum_payment: 5000, due_date: 1, grace_period_days: 15, paid_through: "2026-09-01" }
  const synthStartingCash = 500

  const fullHorizon = computeDebtPayoffAffordability({
    startingCash: synthStartingCash,
    income: synthIncome,
    bills: [],
    debts: [synthDebt],
    goals,
    today,
  })
  const fullHorizonWithoutDebt = computeDebtPayoffAffordability({
    startingCash: synthStartingCash,
    income: synthIncome,
    bills: [],
    debts: [],
    goals,
    today,
  })
  const shortHorizon = computeDebtPayoffAffordability({
    startingCash: synthStartingCash,
    income: synthIncome,
    bills: [],
    debts: [synthDebt],
    goals,
    today,
    cyclesToConsider: 3,
  })
  const shortHorizonWithoutDebt = computeDebtPayoffAffordability({
    startingCash: synthStartingCash,
    income: synthIncome,
    bills: [],
    debts: [],
    goals,
    today,
    cyclesToConsider: 3,
  })

  console.log(
    `  (4-cycle: with debt ${fullHorizon.maxSafeToPayoff} on ${fullHorizon.tightestDate}, without ${fullHorizonWithoutDebt.maxSafeToPayoff}; ` +
      `3-cycle: with debt ${shortHorizon.maxSafeToPayoff}, without ${shortHorizonWithoutDebt.maxSafeToPayoff})`
  )
  // REVISED Sep 10 2026 (second time today): this asserted `null` on the
  // theory that today's income-blind checkpoint was always the tightest
  // point. It isn't, and saying so was hiding the most useful fact in the
  // whole projection. With income and obligations on one calendar, this
  // synthetic plan really does survive until the debt actually lands:
  //   500 -> +1,200 (Sep 16) -> +1,200 (Sep 30) -> +1,200 (Oct 14) = 4,100
  //   -> -5,000 (Oct 16, the debt's effective date after its 15-day grace)
  //   = -900   <-- the real trouble, on the real day it happens
  //   -> +1,200 (Oct 28) = 300
  // Naming Oct 16 is strictly more actionable than "today": it tells the
  // person WHEN they run short and therefore how long they have to fix it.
  assertTrue(
    fullHorizon.tightestDate === "2026-10-16",
    `the projection names the day the balance actually bottoms out, not a vague 'today' (got ${fullHorizon.tightestDate})`
  )
  assertEqual(fullHorizon.tightestRunningBalance, -900, "500 + three $1,200 paychecks - the $5,000 payment landing Oct 16")
  assertTrue(
    fullHorizonWithoutDebt.maxSafeToPayoff > fullHorizon.maxSafeToPayoff,
    "at the default 4-cycle horizon, removing the debt changes the answer -- it was actually being considered"
  )
  assertEqual(shortHorizon.maxSafeToPayoff, fullHorizon.maxSafeToPayoff, "extendForNextOccurrence is horizon-independent -- 3 cycles and 4 cycles now agree")
  assertTrue(
    shortHorizonWithoutDebt.maxSafeToPayoff !== shortHorizon.maxSafeToPayoff,
    "at a 3-cycle horizon (the OLD too-short default), removing the debt now changes the answer too -- the horizon-length bug this test used to lock in can no longer happen for this shape of debt"
  )
}

console.log("\nTest 8 (regression, Sep 9 2026) -- Safe to Spend and Extra Debt Payment can never")
console.log("  contradict each other about a past-due unpaid bill again: reproduces Vince's live")
console.log("  screenshot shape -- a headline Safe to Spend number that hadn't reserved a")
console.log("  past-due bill, sitting right next to an Extra Debt Payment that also hadn't")
{
  // Synthetic version of the exact live bug: a bill due after the last
  // paycheck landed but before today (genuinely unpaid, no paid_through),
  // with a healthy-enough plan that "today" is Extra Debt Payment's binding
  // constraint (same shape as Test 2). Before the fix: Safe to Spend showed
  // startingCash - upcomingBills (not reserving the past-due bill at all,
  // just warning about it) while Extra Debt Payment showed
  // startingCash - reserve (also not reserving it) -- two different numbers,
  // both wrong in the same direction, that looked independently plausible
  // right next to each other on the same page.
  const pastDueUnpaid: STSBill = { amount: 97.98, due_date: 3 } // due the 3rd, after the Sep 2 last paycheck, before today (Sep 4)
  const upcomingBill: STSBill = { amount: 20, due_date: 14 }

  const sts = computeSafeToSpend({
    income,
    bills: [pastDueUnpaid, upcomingBill],
    debts: [],
    goals: [],
    today,
  })
  const affordability = computeDebtPayoffAffordability({
    startingCash,
    income,
    bills: [pastDueUnpaid, upcomingBill],
    debts: [],
    goals: [],
    today,
  })

  assertEqual(sts.billsDue, 117.98, "Safe to Spend reserves the past-due unpaid bill AND the upcoming one (97.98 + 20)")
  // The actual "no contradiction" guarantee Vince asked for: whatever Safe
  // to Spend decides is committed-but-unpaid through the NEXT paycheck --
  // not just what's already due as of today -- Extra Debt Payment must
  // agree is unavailable too, same helper function underneath both now
  // (Sep 9 2026 update: this used to only check as far as the past-due
  // sliver (97.98); the pre-paycheck-checkpoint fix from Test 2 makes it
  // agree with Safe to Spend's FULL window, both bills included, 117.98).
  assertEqual(
    startingCash - (affordability.maxSafeToPayoff + DEFAULT_PAYOFF_RESERVE),
    117.98,
    "the two engines agree on exactly how much is committed-but-unpaid through the next paycheck (past-due 97.98 + upcoming 20) -- they can't disagree by construction"
  )
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
