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

console.log("\nTest 2 -- with nothing paid off yet, the plan's own tightest point sets")
console.log("  maxSafeToPayoff = tightestRunningBalance - reserve, exactly")
{
  const result = computeDebtPayoffAffordability({ startingCash, income, bills, debts: allDebts, goals, today })
  assertEqual(result.reserve, DEFAULT_PAYOFF_RESERVE, "default reserve is $150")
  assertEqual(result.maxSafeToPayoff, result.tightestRunningBalance - result.reserve, "maxSafeToPayoff is tightestRunningBalance minus reserve")
  assertTrue(result.tightestDate !== null, "a tightest cycle date is named, not a black box")
  console.log(`  (tightest point: ${result.tightestRunningBalance} on ${result.tightestDate}, maxSafeToPayoff ${result.maxSafeToPayoff})`)
}

console.log("\nTest 3 -- paying off the real credit-card selection ($1,129.85) is actually safe:")
console.log("  removing those debts' future minimum payments from the projection raises")
console.log("  maxSafeToPayoff enough to cover the cost and still respect the reserve")
{
  const selected = allDebts.filter((d) => CREDIT_CARD_NAMES.includes(d.name))
  const cost = selected.reduce((sum, d) => sum + d.balance, 0)
  const remaining = allDebts.filter((d) => !CREDIT_CARD_NAMES.includes(d.name))
  const result = computeDebtPayoffAffordability({ startingCash, income, bills, debts: remaining, goals, today })
  console.log(`  (cost ${cost}, maxSafeToPayoff after removing them ${result.maxSafeToPayoff})`)
  assertTrue(cost <= result.maxSafeToPayoff, "the $1,129.85 payoff does not exceed what's safe to send to debt")
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

console.log("\nTest 7 (regression) -- the default horizon has to reach far enough to catch a")
console.log("  grace-period-shifted debt that lands on the 4th projected paycheck, not just")
console.log("  the first few -- a synthetic case since Vince's own numbers happen to be")
console.log("  healthy enough that his tightest point is always the very first cycle")
console.log("  regardless of horizon (see Test 2), which would hide this exact bug")
{
  // Same mechanism as the real Onity Mortgage (due the 1st, 15-day grace,
  // September already settled via paid_through) -- nominal Oct 1 shifts to
  // an effective Oct 16, landing in the Oct 14-28 cycle, the 4th one out.
  // Scaled so THIS payment is big enough relative to the paycheck to
  // actually become the tightest point instead of getting absorbed the way
  // Vince's full, healthier plan absorbs his real mortgage (see Test 2).
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
  assertTrue(fullHorizon.tightestDate === "2026-10-28", `the debt's effective Oct 16 due date makes the Oct 28 cycle the tightest one (got ${fullHorizon.tightestDate})`)
  assertTrue(
    fullHorizonWithoutDebt.maxSafeToPayoff > fullHorizon.maxSafeToPayoff,
    "at the default 4-cycle horizon, removing the debt changes the answer -- it was actually being considered"
  )
  assertEqual(
    shortHorizonWithoutDebt.maxSafeToPayoff,
    shortHorizon.maxSafeToPayoff,
    "at a 3-cycle horizon (the old, too-short default), removing the debt changes NOTHING -- it already wasn't being seen, which is exactly the bug the 4-cycle default fixes"
  )
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
