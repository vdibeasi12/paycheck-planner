// lib/__tests__/monthlySafeToSpend.test.ts
//
// Deterministic tests for the monthly Safe-to-Spend rollup
// (lib/monthlySafeToSpend.ts) -- the "Committed Money / Financially Free
// Money" view Vince asked for on the new consolidated /safe-to-spend page
// (Sep 9 2026), built on the same shared engine as lib/safeToSpend.ts and
// lib/debtPayoffSafety.ts so it can't quietly disagree with them the way the
// old app/insights/page.tsx tile (lib/financialOverview.ts) did.
//
// REVISED same day: Vince compared this against Voya's public budget
// calculator and asked for the arithmetic to match -- Financially Free Money
// is now `monthlyIncome - committedMoney`, not `currentBalance -
// committedMoney`. currentBalance is no longer an input to this function at
// all. Run with:
//
//   npx tsx lib/__tests__/monthlySafeToSpend.test.ts
//
// Same no-framework, hand-rolled runner as the rest of lib/__tests__/.

import { computeMonthlySafeToSpend, type MSTSBill, type MSTSDebt, type MSTSGoal, type MSTSIncome } from "../monthlySafeToSpend"

// CRITICAL FIX (Sep 9 2026, Vince): "don't calculate savings in safe to
// spend" -- confirmed this applies to both cards. Tests 5-7 used to prove
// goal contributions were correctly rolled into committedMoney; they now
// prove the opposite -- goals never move committedMoney/financiallyFreeMoney
// at all, no matter how aggressive or overdue.

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
  const r = computeMonthlySafeToSpend({ income, bills, debts, goals: [], today })
  assertEqual(r.monthlyIncome, 2000, "monthlyIncome")
  assertEqual(r.monthlyBills, 1000, "monthlyBills")
  assertEqual(r.monthlyDebtPayments, 200, "monthlyDebtPayments")
  assertEqual(r.committedMoney, 1200, "committedMoney")
  assertEqual(r.financiallyFreeMoney, 800, "financiallyFreeMoney (2000 - 1200)")
  assertTrue(r.transferCoveredDebtNames.length === 0, "no transfer-covered debts")
}

console.log("Test 2 -- transfer income excluded from monthlyIncome")
{
  const income: MSTSIncome[] = [
    { amount: 2000, frequency: "monthly", next_pay_date: "2026-01-15", income_type: null },
    { amount: 500, frequency: "monthly", next_pay_date: "2026-01-15", income_type: "transfer" },
  ]
  const r = computeMonthlySafeToSpend({ income, bills: [], debts: [], goals: [], today })
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
  const r = computeMonthlySafeToSpend({ income, bills: [], debts, goals: [], today })
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
  const r = computeMonthlySafeToSpend({ income, bills: [], debts, goals: [], today })
  assertEqual(r.monthlyDebtPayments, 596.5, "no evidence on file -- debt still reserved")
  assertTrue(r.transferCoveredDebtNames.length === 0, "not listed as covered without evidence")
}

console.log("Test 5 -- a goal due later this same month no longer reduces committedMoney at all")
{
  const goals: MSTSGoal[] = [{ target_amount: 1000, current_amount: 400, deadline: "2026-01-25", status: "active" }]
  const r = computeMonthlySafeToSpend({
    income: [{ amount: 2000, frequency: "monthly", next_pay_date: "2026-01-15", income_type: null }],
    bills: [],
    debts: [],
    goals,
    today,
  })
  assertEqual(r.committedMoney, 0, "no bills/debts, and the goal is ignored -- nothing committed")
  assertEqual(r.financiallyFreeMoney, 2000, "the full monthly income, goal notwithstanding")
}

console.log("Test 6 -- a goal 3 months out still has zero effect")
{
  const goals: MSTSGoal[] = [{ target_amount: 1200, current_amount: 0, deadline: "2026-04-10", status: "active" }]
  const r = computeMonthlySafeToSpend({
    income: [{ amount: 2000, frequency: "monthly", next_pay_date: "2026-01-15", income_type: null }],
    bills: [],
    debts: [],
    goals,
    today,
  })
  assertEqual(r.committedMoney, 0, "goal ignored regardless of how far out its deadline is")
}

console.log("Test 7 -- an overdue goal deadline still has zero effect")
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
    today,
  })
  assertEqual(r.committedMoney, 0, "goal ignored even when overdue")
}

console.log("Test 8 -- Financially Free Money goes negative when committed exceeds monthly income")
{
  const r = computeMonthlySafeToSpend({
    income: [{ amount: 2000, frequency: "monthly", next_pay_date: "2026-01-15", income_type: null }],
    bills: [{ amount: 1500, due_date: 1, frequency: "monthly" }],
    debts: [{ id: "d1", name: "Card", minimum_payment: 200, due_date: 5, covered_by_transfer: false }],
    goals: [],
    today,
  })
  assertEqual(r.committedMoney, 1700, "committedMoney")
  assertEqual(r.financiallyFreeMoney, 300, "2000 - 1700")
}

console.log("Test 9 -- biweekly bill converts to its monthly equivalent")
{
  const r = computeMonthlySafeToSpend({
    income: [{ amount: 2000, frequency: "monthly", next_pay_date: "2026-01-15", income_type: null }],
    bills: [{ amount: 100, due_date: 1, frequency: "biweekly" }],
    debts: [],
    goals: [],
    today,
  })
  assertEqual(r.monthlyBills, 100 * (26 / 12), "biweekly -> monthly factor")
}

console.log("Test 10 -- biweekly income normalizes the same way Voya's calculator does (needs/wants")
console.log("  only -- Vince's Sep 9 2026 fix means the goal in this scenario no longer counts)")
{
  // Cross-check against voya.com/individuals/learn/budget-calculator's own
  // arithmetic: $2,700 every-other-week income, income - allocated =
  // remaining. Same 26/12 monthly factor as lib/monthlyFactor.ts.
  const income: MSTSIncome[] = [{ amount: 2700, frequency: "biweekly", next_pay_date: "2026-01-15", income_type: null }]
  const bills: MSTSBill[] = [
    { amount: 2200, due_date: 1, frequency: "monthly" }, // housing
    { amount: 300, due_date: 1, frequency: "monthly" }, // utilities
    { amount: 300, due_date: 1, frequency: "monthly" }, // groceries
    { amount: 100, due_date: 1, frequency: "monthly" }, // transportation
  ]
  const debts: (MSTSDebt & { id: string; name: string })[] = [
    { id: "d1", name: "Other debt", minimum_payment: 75, due_date: 1, covered_by_transfer: false },
  ]
  const goals: MSTSGoal[] = [{ target_amount: 1000, current_amount: 0, deadline: "2026-01-31", status: "active" }]
  const r = computeMonthlySafeToSpend({ income, bills, debts, goals, today })
  assertEqual(r.monthlyIncome, 5850, "2700 * 26/12")
  assertEqual(r.committedMoney, 2975, "bills + debt only -- the goal no longer adds to committedMoney")
  assertEqual(r.financiallyFreeMoney, 2875, "5850 - 2975, savings no longer subtracted")
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
