// lib/__tests__/planResilienceSplit.test.ts
//
// CRITICAL FIX (Sep 9 2026, Vince, live screenshot): "Paycheck Shield is
// still calculating 100% and that's incorrect. It needs an actual measure
// of units to calculate a real score." Paycheck Shield's own scoring math
// (lib/planResilience.ts's strengthScore) was never the bug -- it's a
// genuine point-penalty calculation. The bug was that this whole file
// pooled every checking account into one balance before stress-testing it,
// exactly the same mistake Safe to Spend made before its own account split
// (lib/accountSafeToSpend.ts). Someone who keeps separate accounts for
// separate obligations (53rd for the mortgage/car/personal loan, Chime for
// utilities/credit cards) can have a real, already-confirmed shortfall on
// one account totally hidden by averaging it against a healthy other one --
// a "100/100 STRONG" score built on a number that isn't true for either
// real account.
//
// This test reproduces that exact shape: 53rd is healthy on its own, Chime
// alone cannot cover its own bills before its own paycheck lands, and the
// OLD pooled computePlanResilience call (kept below for comparison) says
// 100/100 anyway because Chime's real shortfall gets absorbed by 53rd's
// surplus once everything is added into one balance. The new
// computeAccountSplitPlanResilience must not make that mistake, and its
// combined score must be the MINIMUM of the two accounts' own scores, not
// an average -- a shield is only as strong as its weakest account, since
// money never moves between them on its own.
//
// Run with:
//   npx tsx lib/__tests__/planResilienceSplit.test.ts

import { shouldSplitByAccount } from "../accountSafeToSpend"
import { computeAccountSplitPlanResilience, computePlanResilience } from "../planResilience"
import type { CashAccountRow } from "../cashBalance"

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

const today = new Date("2026-09-09T00:00:00")
const todayISO = "2026-09-09"

const account53rd: CashAccountRow = {
  id: "acct-53rd",
  kind: "checking",
  name: "53rd Checking",
  balance: 3303.13,
  balance_as_of: "2026-09-04",
}
const accountChime: CashAccountRow = {
  id: "acct-chime",
  kind: "checking",
  name: "Chime Checking",
  balance: 73.77,
  balance_as_of: "2026-09-09",
}

console.log("Scenario -- Vince's real split: mortgage/car/personal loan on 53rd,")
console.log("  utilities/credit cards/rent share on Chime. Pooled would call this")
console.log("  100/100 STRONG (exactly the live bug); split should show Chime alone")
console.log("  cannot cover its own bills before its own paycheck lands.")
{
  const income = [
    { amount: 1660.0, frequency: "biweekly", next_pay_date: "2026-09-16", income_type: null, cash_account_id: "acct-53rd" },
    { amount: 918.4, frequency: "biweekly", next_pay_date: "2026-09-16", income_type: null, cash_account_id: "acct-chime" },
  ]
  const bills = [
    { id: "b1", name: "Xfinity", amount: 96.31, due_date: 14, cash_account_id: "acct-chime" },
    { id: "b2", name: "ComEd", amount: 120.0, due_date: 12, cash_account_id: "acct-chime" },
    { id: "b3", name: "Xfinity Mobile", amount: 142.71, due_date: 12, cash_account_id: "acct-chime" },
    { id: "b4", name: "Rent Share", amount: 700.0, due_date: 12, cash_account_id: "acct-chime" },
  ]
  const debts = [
    { id: "d1", name: "Capital One Auto", minimum_payment: 596.5, due_date: 15, cash_account_id: "acct-53rd" },
    { id: "d2", name: "Avant", minimum_payment: 507.61, due_date: 22, cash_account_id: "acct-53rd" },
    { id: "d3", name: "Credit Card", minimum_payment: 50.0, due_date: 12, cash_account_id: "acct-chime" },
  ]

  assertTrue(
    shouldSplitByAccount([account53rd, accountChime], income, bills, debts),
    "2 checking accounts each with something linked -- split activates"
  )

  // The old, pre-fix behavior: everything pooled into one balance. This is
  // the exact number Vince's screenshot showed (100/100 STRONG) -- locked in
  // here as a "here's the bug" comparison, not as something we want.
  const pooled = computePlanResilience({
    income,
    bills,
    debts,
    goals: [],
    today,
    startingCash: account53rd.balance + accountChime.balance,
  })
  assertEqual(pooled.strengthScore, 100, "pooled score reproduces the live bug -- 100/100 even though Chime alone is upside down")

  const split = computeAccountSplitPlanResilience({
    checkingAccounts: [account53rd, accountChime],
    income,
    bills,
    debts,
    goals: [],
    todayISO,
    today,
  })

  assertTrue(split.isSplit, "split.isSplit is true")
  assertEqual(split.accounts.length, 2, "one section per checking account")

  const fiftyThird = split.accounts.find((a) => a.account.id === "acct-53rd")!
  const chime = split.accounts.find((a) => a.account.id === "acct-chime")!

  assertTrue(fiftyThird.result.hasPlan, "53rd has a projectable plan of its own")
  assertTrue(chime.result.hasPlan, "Chime has a projectable plan of its own")

  // --- 53rd: healthy on its own, unaffected by Chime's shortfall ---
  assertEqual(fiftyThird.result.strengthScore, 100, "53rd alone is STRONG -- its own mortgage/car/loan plan holds up fine")
  assertTrue(
    fiftyThird.bills.every((b) => b.cash_account_id !== "acct-chime"),
    "53rd's own bill list never includes Chime's rent share/utilities"
  )

  // --- Chime: real shortfall the pooled number hid entirely ---
  assertTrue(
    chime.result.weakestCycle != null && chime.result.weakestCycle.runningBalance < 0,
    `Chime's own weakest projected cycle actually goes negative (${chime.result.weakestCycle?.runningBalance}) -- a real shortfall, not a stress-test artifact`
  )
  assertTrue(chime.result.strengthScore < 50, `Chime's own score (${chime.result.strengthScore}) reads as weak/vulnerable, not strong`)
  assertTrue(
    chime.debts.every((d) => d.name !== "Capital One Auto" && d.name !== "Avant"),
    "Chime's own debt list never includes 53rd's car loan or personal loan"
  )

  // --- The combined score is Chime's score exactly (the minimum), never an
  // average of the two -- an average would still read as comfortably above
  // 50 here (100 and 0 average to 50), silently repeating the same masking
  // bug one level up. ---
  assertEqual(split.overallStrengthScore, chime.result.strengthScore, "overall score equals the WEAKER account's own score")
  assertTrue(
    split.overallStrengthScore < (fiftyThird.result.strengthScore + chime.result.strengthScore) / 2,
    "overall score is strictly below what an average of the two accounts would have shown -- proves min(), not mean()"
  )
  assertTrue(split.weakestAccount?.account.id === "acct-chime", "weakestAccount correctly names Chime, not 53rd")
}

console.log("\nScenario -- fallback behavior for everyone who hasn't set up per-account budgeting")
{
  const income = [{ amount: 2578.4, frequency: "biweekly", next_pay_date: "2026-09-16", income_type: null, cash_account_id: null }]
  const bills = [{ id: "b1", name: "Netflix", amount: 8.99, due_date: 14, cash_account_id: null }]
  const debts = [{ id: "d1", name: "Visa", minimum_payment: 50, due_date: 20, cash_account_id: null }]

  assertTrue(
    !shouldSplitByAccount([account53rd, accountChime], income, bills, debts),
    "2 checking accounts but nothing linked to either -- split does NOT activate"
  )

  const split = computeAccountSplitPlanResilience({
    checkingAccounts: [account53rd, accountChime],
    income,
    bills,
    debts,
    goals: [],
    todayISO,
    today,
  })
  assertTrue(!split.isSplit, "computeAccountSplitPlanResilience agrees -- isSplit false, accounts empty")
  assertEqual(split.accounts.length, 0, "no per-account sections when not split")
  assertEqual(split.overallStrengthScore, 0, "overallStrengthScore is 0 (not used) when not split")
  assertTrue(split.weakestAccount === null, "weakestAccount is null when not split")
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
