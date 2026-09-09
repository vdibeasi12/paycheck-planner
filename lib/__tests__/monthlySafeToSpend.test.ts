// lib/__tests__/monthlySafeToSpend.test.ts
//
// Deterministic tests for the monthly Safe-to-Spend rollup
// (lib/monthlySafeToSpend.ts) -- the "Committed Money / Financially Free
// Money" view Vince asked for on the new consolidated /safe-to-spend page
// (Sep 9 2026), built on the same shared engine as lib/safeToSpend.ts and
// lib/debtPayoffSafety.ts so it can't quietly disagree with them the way the
// old app/insights/page.tsx tile (lib/financialOverview.ts) did. Run with:
//
//   npx tsx lib/__tests__/monthlySafeToSpend.test.ts
//
// Same no-framework, hand-rolled runner as the rest of lib/__tests__/.

import { computeMonthlySafeToSpend, type MSTSBill, type MSTSDebt, type MSTSGoal, type MSTSIncome } from "../monthlySafeToSpend"

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

const today = new Date("2026-01-10T00:00:00")

console.log("Test 1 -- plain monthly rollup, no transfers/goals")
{
  const income: MSTSIncome[] = [{ amount: 2000, frequency: "monthly", next_pay_date: "2026-01-15", income_type: null }]
  const bills: MSTSBill[] = [{ amount: 1000, due_date: 1, frequency: "monthly" }]
  const debts: (MSTSDebt & { id: string; name: string })[] = [
    { id: "d1", name: "Card", minimum_payment: 200, due_date: 5, covered_by_transfer: false },
  ]
  const r = computeMonthlySafeToSpend({
    income,
    bills,
    debts,
    goals: [],
    currentBalance: 3000,
    currentBalanceSource: "checking",
    currentBalanceAsOf: "2026-01-10",
    today,
  })
  assertEqual(r.monthlyIncome, 2000, "monthlyIncome")
  assertEqual(r.monthlyBills, 1000, "monthlyBills")
  assertEqual(r.monthlyDebtPayments, 200, "monthlyDebtPayments")
  assertEqual(r.monthlyGoalContributions, 0, "monthlyGoalContributions")
  assertEqual(r.committedMoney, 1200, "committedMoney")
  assertEqual(r.financiallyFreeMoney, 1800, "financiallyFreeMoney (3000 - 1200)")
  assertTrue(r.transferCoveredDebtNames.length === 0, "no transfer-covered debts")
}

console.log("Test 2 -- transfer income excluded from monthlyIncome")
{
  const income: MSTSIncome[] = [
    { amount: 2000, frequency: "monthly", next_pay_date: "2026-01-15", income_type: null },
    { amount: 500, frequency: "monthly", next_pay_date: "2026-01-15", income_type: "transfer" },
  ]
  const r = computeMonthlySafeToSpend({
    income,
    bills: [],
    debts: [],
    goals: [],
    currentBalance: 1000,
    currentBalanceSource: "lastPaycheck",
    currentBalanceAsOf: null,
    today,
  })
  assertEqual(r.monthlyIncome, 2000, "transfer row excluded")
}

console.log("Test 3 -- transfer-covered debt WITH evidence is excluded from committed money")
{
  const income: MSTSIncome[] = [
    { amount: 2000, frequency: "monthly", next_pay_date: "2026-01-15", income_type: null },
    { amount: 600, frequency: "monthly", next_pay_date: "2026-01-15", income_type: "transfer" },
  ]
  const debts: (MSTSDebt & { id: string; name: string })[] = [
    { id: "auto", name: "Capital One Auto", minimum_payment: 596.5, due_date: 12, covered_by_transfer: true },
  ]
  const r = computeMonthlySafeToSpend({
    income,
    bills: [],
    debts,
    goals: [],
    currentBalance: 1000,
    currentBalanceSource: "checking",
    currentBalanceAsOf: "2026-01-10",
    today,
  })
  assertEqual(r.monthlyDebtPayments, 0, "covered debt excluded from monthlyDebtPayments")
  assertTrue(r.transferCoveredDebtNames.includes("Capital One Auto"), "covered debt named for transparency")
}

console.log("Test 4 -- transfer-covered debt WITHOUT evidence is still reserved (regression guard)")
{
  // Same live bug lib/safeToSpend.ts was fixed for (Sep 4 2026): a debt
  // flagged covered_by_transfer with zero corroborating transfer-income rows
  // on file must not silently vanish from Committed Money either.
  const income: MSTSIncome[] = [{ amount: 2000, frequency: "monthly", next_pay_date: "2026-01-15", income_type: null }]
  const debts: (MSTSDebt & { id: string; name: string })[] = [
    { id: "auto", name: "Capital One Auto", minimum_payment: 596.5, due_date: 12, covered_by_transfer: true },
  ]
  const r = computeMonthlySafeToSpend({
    income,
    bills: [],
    debts,
    goals: [],
    currentBalance: 1000,
    currentBalanceSource: "checking",
    currentBalanceAsOf: "2026-01-10",
    today,
  })
  assertEqual(r.monthlyDebtPayments, 596.5, "no evidence on file -- debt still reserved")
  assertTrue(r.transferCoveredDebtNames.length === 0, "not listed as covered without evidence")
}

console.log("Test 5 -- goal due later this same month reserves its full remaining amount")
{
  const goals: MSTSGoal[] = [{ target_amount: 1000, current_amount: 400, deadline: "2026-01-25", status: "active" }]
  const r = computeMonthlySafeToSpend({
    income: [{ amount: 2000, frequency: "monthly", next_pay_date: "2026-01-15", income_type: null }],
    bills: [],
    debts: [],
    goals,
    currentBalance: 1000,
    currentBalanceSource: "checking",
    currentBalanceAsOf: "2026-01-10",
    today,
  })
  assertEqual(r.monthlyGoalContributions, 600, "full remaining (1000-400) due this month")
}

console.log("Test 6 -- goal 3 months out spreads remaining evenly")
{
  const goals: MSTSGoal[] = [{ target_amount: 1200, current_amount: 0, deadline: "2026-04-10", status: "active" }]
  const r = computeMonthlySafeToSpend({
    income: [{ amount: 2000, frequency: "monthly", next_pay_date: "2026-01-15", income_type: null }],
    bills: [],
    debts: [],
    goals,
    currentBalance: 1000,
    currentBalanceSource: "checking",
    currentBalanceAsOf: "2026-01-10",
    today,
  })
  // Jan -> Apr is 3 calendar months out.
  assertEqual(r.monthlyGoalContributions, 400, "1200 / 3 months")
}

console.log("Test 7 -- overdue goal deadline counts in full; inactive/funded goals excluded")
{
  const goals: MSTSGoal[] = [
    { target_amount: 500, current_amount: 100, deadline: "2026-01-01", status: "active" }, // overdue
    { target_amount: 500, current_amount: 500, deadline: "2026-06-01", status: "active" }, // funded
    { target_amount: 500, current_amount: 0, deadline: "2026-06-01", status: "paused" }, // inactive
  ]
  const r = computeMonthlySafeToSpend({
    income: [{ amount: 2000, frequency: "monthly", next_pay_date: "2026-01-15", income_type: null }],
    bills: [],
    debts: [],
    goals,
    currentBalance: 1000,
    currentBalanceSource: "checking",
    currentBalanceAsOf: "2026-01-10",
    today,
  })
  assertEqual(r.monthlyGoalContributions, 400, "only the overdue goal's remaining 400 counts")
}

console.log("Test 8 -- Financially Free Money goes negative when committed exceeds current balance")
{
  const r = computeMonthlySafeToSpend({
    income: [{ amount: 2000, frequency: "monthly", next_pay_date: "2026-01-15", income_type: null }],
    bills: [{ amount: 1500, due_date: 1, frequency: "monthly" }],
    debts: [{ id: "d1", name: "Card", minimum_payment: 200, due_date: 5, covered_by_transfer: false }],
    goals: [],
    currentBalance: 900,
    currentBalanceSource: "lastPaycheck",
    currentBalanceAsOf: null,
    today,
  })
  assertEqual(r.committedMoney, 1700, "committedMoney")
  assertEqual(r.financiallyFreeMoney, -800, "900 - 1700, allowed to go negative")
}

console.log("Test 9 -- biweekly bill converts to its monthly equivalent")
{
  const r = computeMonthlySafeToSpend({
    income: [{ amount: 2000, frequency: "monthly", next_pay_date: "2026-01-15", income_type: null }],
    bills: [{ amount: 100, due_date: 1, frequency: "biweekly" }],
    debts: [],
    goals: [],
    currentBalance: 1000,
    currentBalanceSource: "checking",
    currentBalanceAsOf: "2026-01-10",
    today,
  })
  assertEqual(r.monthlyBills, 100 * (26 / 12), "biweekly -> monthly factor")
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
