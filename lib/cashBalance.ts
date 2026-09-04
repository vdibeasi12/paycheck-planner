// lib/cashBalance.ts
// Resolves the most accurate "what do I actually have to spend from right
// now" figure available, for Safe to Spend / Survival Mode. Plaid Auth
// (live checking balance) was denied for Production, so this is the
// alternative: the user types in their real Checking balance once (with the
// date it was accurate), and the app PROJECTS it forward to today using the
// income/bills/debts already on file (see lib/paycheckCycles.ts's
// projectRunningBalance) -- no live bank feed, but it doesn't go stale the
// moment they stop re-checking their bank either. Savings is tracked the
// same way but shown as-is (nothing in this app's data model scheduled-debits
// a savings account, so there's nothing to project forward with).
//
// This deliberately replaced an earlier "list of N accounts, link one to
// imported transactions" version (shipped same day, never used) -- that
// modeled the wrong problem. What actually fixes Safe to Spend is one real
// Checking balance projected forward, not a longer list of static numbers.

import {
  projectRunningBalance,
  type CycleIncome,
  type CycleBill,
  type CycleDebt,
} from "./paycheckCycles"

export type CashAccountRow = {
  kind: "checking" | "savings"
  balance: number
  balance_as_of: string // ISO date
}

export type StartingCashSource = "lastPaycheck" | "checking"

export type StartingCash = {
  amount: number
  source: StartingCashSource
  // The balance_as_of date for a "checking" source -- lets the UI say
  // "as of Sept 1, projected to today" instead of implying a live balance.
  asOf: string | null
}

export function resolveStartingCash(
  checkingRow: CashAccountRow | null,
  input: { income: CycleIncome[]; bills: CycleBill[]; debts: CycleDebt[]; todayISO: string },
  lastPaycheckAmount: number
): StartingCash {
  if (!checkingRow) {
    return { amount: lastPaycheckAmount, source: "lastPaycheck", asOf: null }
  }
  const amount = projectRunningBalance({
    anchorBalance: checkingRow.balance,
    anchorDateISO: checkingRow.balance_as_of,
    asOfISO: input.todayISO,
    income: input.income,
    bills: input.bills,
    debts: input.debts,
  })
  return { amount, source: "checking", asOf: checkingRow.balance_as_of }
}
