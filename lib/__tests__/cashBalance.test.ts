// lib/__tests__/cashBalance.test.ts
//
// Deterministic tests for per-account auto-adjust (lib/cashBalance.ts's
// projectAccountBalance/projectAllAccountBalances). Run with:
//
//   npx tsx lib/__tests__/cashBalance.test.ts
//
// Sep 4 2026, Vince: "have the credit cards and debt use transaction which
// will minus the amount in checking and savings, also add when a paycheck
// will be sent on the due date, so those checking plus savings should auto
// adjust." Before this, an account's balance was a number the user typed
// in and nothing else ever changed it (short of "Mark as paid" or another
// manual edit) -- these tests lock in that a SPECIFIC account's own
// balance now moves on its own once a bill/debt/paycheck is actually
// linked to it (cash_account_id), and that something left unlinked does
// NOT move any one account's number (it still counts toward the pooled
// Safe-to-Spend total elsewhere -- see safeToSpend.test.ts -- just not
// here).

import {
  projectAccountBalance,
  projectAllAccountBalances,
  resolveStartingCash,
  savingsAccountIdsOf,
  type CashAccountRow,
  type AccountProjectionInput,
} from "../cashBalance"
import type { CycleBill, CycleDebt, CycleIncome } from "../paycheckCycles"

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
  if (Math.abs(actual - expected) < 0.005) {
    passed++
    console.log(`  PASS  ${label} (${actual})`)
  } else {
    failed++
    console.error(`  FAIL  ${label} -- expected ${expected}, got ${actual}`)
  }
}

const checking: CashAccountRow = { id: "acct-checking", kind: "checking", name: "53rd Checking", balance: 3303.13, balance_as_of: "2026-09-04" }
const otherChecking: CashAccountRow = { id: "acct-other", kind: "checking", name: "Chime Checking", balance: 375.17, balance_as_of: "2026-09-04" }
const savings: CashAccountRow = { id: "acct-savings", kind: "savings", name: "Chime Savings", balance: 1007.37, balance_as_of: "2026-09-04" }

const todayISO = "2026-09-04"

console.log("Test 1 -- a debt linked to this account subtracts on its due date")
{
  const mortgage: CycleDebt = { minimum_payment: 2220.86, due_date: 20, cash_account_id: "acct-checking" }
  const balance = projectAccountBalance(checking, { income: [], bills: [], debts: [mortgage], todayISO: "2026-09-25" })
  assertEqual(balance, 3303.13 - 2220.86, "3303.13 - 2220.86 = 1082.27 once the due date has passed")
}

console.log("Test 2 -- a paycheck linked to this account adds on its pay date")
{
  const paycheck: CycleIncome = { amount: 2578.4, frequency: "biweekly", next_pay_date: "2026-09-16", income_type: null, cash_account_id: "acct-checking" }
  const balance = projectAccountBalance(checking, { income: [paycheck], bills: [], debts: [], todayISO: "2026-09-20" })
  assertEqual(balance, 3303.13 + 2578.4, "3303.13 + 2578.40 once payday has passed")
}

console.log("Test 3 (regression) -- a bill/debt NOT linked to any account doesn't move this")
console.log("  account's own balance, even though it's due and even though this is the only account")
{
  const unlinkedDebt: CycleDebt = { minimum_payment: 596.5, due_date: 15 } // no cash_account_id at all
  const balance = projectAccountBalance(checking, { income: [], bills: [], debts: [unlinkedDebt], todayISO: "2026-09-20" })
  assertEqual(balance, 3303.13, "unlinked debt doesn't touch this account -- it still needs to be linked in Bills & Debts")
}

console.log("Test 4 (regression) -- money linked to ONE account never leaks into another account's")
console.log("  projection, even when both accounts are passed into the same projection call")
{
  const debtOnChecking: CycleDebt = { minimum_payment: 596.5, due_date: 15, cash_account_id: "acct-checking" }
  const input: AccountProjectionInput = { income: [], bills: [], debts: [debtOnChecking], todayISO: "2026-09-20" }
  const checkingBalance = projectAccountBalance(checking, input)
  const otherBalance = projectAccountBalance(otherChecking, input)
  assertEqual(checkingBalance, 3303.13 - 596.5, "53rd Checking is reduced by the debt linked to IT")
  assertEqual(otherBalance, 375.17, "Chime Checking is untouched -- the debt isn't linked to it")
}

console.log("Test 5 (regression) -- the exact live Sep 4 2026 scenario: Onity Mortgage, Capital")
console.log("  One Auto, and Avant are all linked to 53rd Checking (the bi-weekly $1600 account),")
console.log("  and should all three come out of it once their due dates pass")
{
  const mortgage: CycleDebt = { minimum_payment: 2220.86, due_date: 1, grace_period_days: 15, cash_account_id: "acct-checking", paid_through: "2026-09-01" }
  const capitalOneAuto: CycleDebt = { minimum_payment: 596.5, due_date: 15, cash_account_id: "acct-checking" }
  const avant: CycleDebt = { minimum_payment: 507.61, due_date: 22, cash_account_id: "acct-checking" }
  // Sep 4 anchor ($3,303.13, already net of the mortgage payment -- see
  // paid_through), projected to Sep 25 -- Capital One Auto (15th) and Avant
  // (22nd) have both come due since, the mortgage has not (already paid).
  const balance = projectAccountBalance(checking, {
    income: [],
    bills: [],
    debts: [mortgage, capitalOneAuto, avant],
    todayISO: "2026-09-25",
  })
  assertEqual(balance, 3303.13 - 596.5 - 507.61, "mortgage already settled (paid_through), Capital One Auto + Avant both out")
}

console.log("Test 6 -- savings can auto-adjust too, once something is actually linked to it")
console.log("  (previously nothing in this app ever scheduled a savings movement)")
{
  const debtFromSavings: CycleDebt = { minimum_payment: 100, due_date: 10, cash_account_id: "acct-savings" }
  const balance = projectAccountBalance(savings, { income: [], bills: [], debts: [debtFromSavings], todayISO: "2026-09-20" })
  assertEqual(balance, 1007.37 - 100, "savings isn't exempt once something is actually linked to it")
}

console.log("Test 7 -- projectAllAccountBalances computes every account at once, keyed by id")
{
  const debtOnChecking: CycleDebt = { minimum_payment: 200, due_date: 10, cash_account_id: "acct-checking" }
  const map = projectAllAccountBalances([checking, otherChecking, savings], {
    income: [],
    bills: [],
    debts: [debtOnChecking],
    todayISO: "2026-09-20",
  })
  assertEqual(map.get("acct-checking") ?? -1, 3303.13 - 200, "53rd Checking reflects its own linked debt")
  assertEqual(map.get("acct-other") ?? -1, 375.17, "Chime Checking is untouched")
  assertEqual(map.get("acct-savings") ?? -1, 1007.37, "Chime Savings is untouched")
}

console.log("\nSavings is emergency money and never spendable (Sep 11 2026, Vince: \"stop")
console.log("  counting the savings in Chime, that is for emergency money only not part of")
console.log("  safe to spend... it's not to be used to pay bills or debt\")")
{
  // The anchor balance resolveStartingCash starts from has always been
  // checking-only. The leak was on the OTHER side: the projection carrying
  // that anchor forward to today was handed every income/bill/debt row
  // regardless of which account it belonged to. So money moving in or out of
  // SAVINGS moved the CHECKING figure. These lock both directions shut.
  const savingsIds = savingsAccountIdsOf([checking, otherChecking, savings])
  assertEqual(savingsIds.length, 1, "savingsAccountIdsOf picks out only the savings account")
  assertTrue(savingsIds[0] === savings.id, "and it's the right one")

  const base = { income: [] as CycleIncome[], bills: [] as CycleBill[], debts: [] as CycleDebt[], todayISO: "2026-09-20" }
  const pooledChecking = 3303.13 + 375.17

  // A paycheck deposited into SAVINGS must not inflate checking.
  const payToSavings: CycleIncome = { amount: 2000, frequency: "monthly", next_pay_date: "2026-09-10", cash_account_id: savings.id }
  const withSavingsIncome = resolveStartingCash([checking, otherChecking], { ...base, income: [payToSavings], savingsAccountIds: savingsIds }, 0)
  assertEqual(withSavingsIncome.amount, pooledChecking, "a paycheck paid into savings does not raise the checking total")

  const leakedIncome = resolveStartingCash([checking, otherChecking], { ...base, income: [payToSavings] }, 0)
  assertEqual(leakedIncome.amount, pooledChecking + 2000, "and without the savings ids it WOULD have -- this is the bug being fixed, not a hypothetical")

  // A bill paid out of SAVINGS must not drain checking either.
  const billFromSavings: CycleBill = { amount: 500, due_date: 12, cash_account_id: savings.id }
  const withSavingsBill = resolveStartingCash([checking, otherChecking], { ...base, bills: [billFromSavings], savingsAccountIds: savingsIds }, 0)
  assertEqual(withSavingsBill.amount, pooledChecking, "a bill linked to savings does not reduce the checking total")

  const debtFromSavings: CycleDebt = { minimum_payment: 300, due_date: 12, cash_account_id: savings.id }
  const withSavingsDebt = resolveStartingCash([checking, otherChecking], { ...base, debts: [debtFromSavings], savingsAccountIds: savingsIds }, 0)
  assertEqual(withSavingsDebt.amount, pooledChecking, "nor does a debt linked to savings")

  // The deliberate exception, unchanged: an item with NO account linked is
  // "not assigned yet," not "belongs to savings," and still counts. Breaking
  // this would silently drop real obligations out of Safe to Spend.
  const unlinkedBill: CycleBill = { amount: 500, due_date: 12 }
  const withUnlinked = resolveStartingCash([checking, otherChecking], { ...base, bills: [unlinkedBill], savingsAccountIds: savingsIds }, 0)
  assertEqual(withUnlinked.amount, pooledChecking - 500, "an unlinked bill still counts against checking, exactly as before")

  // And a checking-linked item is obviously unaffected by any of this.
  const checkingBill: CycleBill = { amount: 500, due_date: 12, cash_account_id: checking.id }
  const withCheckingBill = resolveStartingCash([checking, otherChecking], { ...base, bills: [checkingBill], savingsAccountIds: savingsIds }, 0)
  assertEqual(withCheckingBill.amount, pooledChecking - 500, "a checking-linked bill still counts")

  // The headline guarantee, stated as one assertion: the savings balance
  // itself never appears in the spendable figure, whatever it holds.
  const richSavings: CashAccountRow = { ...savings, balance: 999999 }
  const withRichSavings = resolveStartingCash([checking, otherChecking], { ...base, savingsAccountIds: savingsAccountIdsOf([checking, otherChecking, richSavings]) }, 0)
  assertEqual(withRichSavings.amount, pooledChecking, "a savings balance of any size changes the spendable total by exactly nothing")
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
