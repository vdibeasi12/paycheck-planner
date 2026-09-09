// lib/__tests__/accountSafeToSpend.test.ts
//
// Sep 9 2026, Vince, after the "What's committed" reconciliation shipped:
// "the safe to spend is not correct. I do not have $2,421.88 that is safe
// to spend... 53rd only gets $1660 per paycheck to save and pay [mortgage/
// car/personal loan]. The chime account gets the rest to pay utilities and
// credit cards." Confirmed against his live data: mortgage, car loan, and
// Avant (his personal loan) are all linked to 53rd Checking; every credit
// card and utility bill is linked to Chime Checking -- exactly the split
// this file's engine (lib/accountSafeToSpend.ts) is built to respect.
//
// This scenario is deliberately built so the pooled total would say
// everything's fine while one specific account is actually about to
// overdraft -- the exact failure mode Vince described, proven numerically
// rather than just asserted.
//
// Run with:
//   npx tsx lib/__tests__/accountSafeToSpend.test.ts

import { shouldSplitByAccount, computeAccountSplitSafeToSpend } from "../accountSafeToSpend"
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
console.log("  utilities/credit cards on Chime. Pooled would call this fine; split")
console.log("  should show Chime is actually about to go negative.")
{
  const income = [
    { amount: 1660.0, frequency: "biweekly", next_pay_date: "2026-09-16", income_type: null, cash_account_id: "acct-53rd" },
    { amount: 918.4, frequency: "biweekly", next_pay_date: "2026-09-16", income_type: null, cash_account_id: "acct-chime" },
  ]
  const bills = [
    { id: "b1", name: "Xfinity", amount: 96.31, due_date: 14, cash_account_id: "acct-chime" },
  ]
  const debts = [
    { id: "d1", name: "Capital One Auto", minimum_payment: 596.5, due_date: 15, cash_account_id: "acct-53rd" },
    { id: "d2", name: "Credit Card", minimum_payment: 50.0, due_date: 12, cash_account_id: "acct-chime" },
  ]

  assertTrue(
    shouldSplitByAccount([account53rd, accountChime], income, bills, debts),
    "2 checking accounts each with something linked -- split activates"
  )

  const split = computeAccountSplitSafeToSpend({
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
  assertEqual(split.unassignedBillsTotal, 0, "nothing unassigned -- every bill has an account")
  assertEqual(split.unassignedDebtsTotal, 0, "nothing unassigned -- every debt has an account")

  const fiftyThird = split.accounts.find((a) => a.account.id === "acct-53rd")!
  const chime = split.accounts.find((a) => a.account.id === "acct-chime")!

  // --- 53rd: its own balance minus ONLY its own linked debt ---
  assertEqual(fiftyThird.cycle.startingCash, 3303.13, "53rd starting cash is its own real balance, not the pool")
  assertEqual(fiftyThird.cycle.billsDue, 0, "53rd has no bills linked to it")
  assertEqual(fiftyThird.cycle.debtsDue, 596.5, "53rd's own debt (Capital One Auto) is the only thing subtracted")
  assertEqual(fiftyThird.cycle.safeToSpend, 3303.13 - 596.5, "53rd Safe to Spend never sees Chime's credit card")
  assertTrue(
    fiftyThird.classifiedDebts.every((d) => d.name !== "Credit Card"),
    "53rd's itemized list never includes Chime's credit card"
  )

  // --- Chime: its own tiny balance minus ITS OWN bills/debts -- this is the
  // exact number the pooled engine was hiding. Pooled total (3303.13 +
  // 73.77 - 596.50 - 96.31 - 50 = 2634.09) looks perfectly safe; Chime
  // alone cannot cover what's actually coming out of it. ---
  assertEqual(chime.cycle.startingCash, 73.77, "Chime starting cash is its own real balance, not the pool")
  assertEqual(chime.cycle.billsDue, 96.31, "Chime's own bill (Xfinity) is subtracted")
  assertEqual(chime.cycle.debtsDue, 50, "Chime's own debt (Credit Card) is subtracted")
  assertEqual(chime.cycle.safeToSpend, 73.77 - 96.31 - 50, "Chime Safe to Spend is negative -- a real shortfall the pooled number hid")
  assertTrue(chime.cycle.safeToSpend < 0, "Chime alone cannot cover its own bills -- exactly what Vince flagged")
  assertTrue(
    chime.classifiedDebts.every((d) => d.name !== "Capital One Auto"),
    "Chime's itemized list never includes 53rd's car loan"
  )

  // --- Extra Debt Payment must reflect the same split -- sending extra to
  // credit card debt can only ever draw on Chime's own thin cushion, never
  // on the mortgage/car reserve sitting in 53rd. ---
  assertTrue(
    chime.affordability.maxSafeToPayoff < 0,
    `Chime's own Extra Debt Payment (${chime.affordability.maxSafeToPayoff}) correctly says "not safe right now" instead of borrowing 53rd's reserve`
  )
  assertTrue(
    fiftyThird.affordability.maxSafeToPayoff > 1000,
    "53rd's own Extra Debt Payment is healthy and computed independently of Chime's shortfall"
  )
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
  assertTrue(
    !shouldSplitByAccount([account53rd], [{ ...income[0], cash_account_id: "acct-53rd" }], bills, debts),
    "only 1 checking account -- split does NOT activate even if it's linked"
  )
  assertTrue(
    !shouldSplitByAccount(
      [account53rd, accountChime],
      [{ ...income[0], cash_account_id: "acct-53rd" }],
      bills,
      debts
    ),
    "only ONE of the two accounts has anything linked -- split does NOT activate yet"
  )

  const split = computeAccountSplitSafeToSpend({
    checkingAccounts: [account53rd, accountChime],
    income,
    bills,
    debts,
    goals: [],
    todayISO,
    today,
  })
  assertTrue(!split.isSplit, "computeAccountSplitSafeToSpend agrees -- isSplit false, accounts empty")
  assertEqual(split.accounts.length, 0, "no per-account sections when not split")
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
