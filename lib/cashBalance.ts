// lib/cashBalance.ts
// Resolves the most accurate "what do I actually have to spend from right
// now" figure available, for Safe to Spend / Survival Mode / Paycheck
// Shield. Plaid Auth (live checking balance) was denied for Production, so
// this is the alternative: the user types in their real balances (as many
// Checking and Savings accounts as they actually have, with the date each
// was accurate), and the app PROJECTS the pooled Checking total forward to
// today using the income/bills/debts already on file (see
// lib/paycheckCycles.ts's projectRunningBalance) -- no live bank feed, but
// it doesn't go stale the moment they stop re-checking their bank either.
// Savings is tracked the same way but pooled and shown as-is (nothing in
// this app's data model scheduled-debits a savings account, so there's
// nothing to project forward with).
//
// Multiple accounts per kind (Sep 4 2026, Vince): any number of named
// Checking accounts are summed into one pool before projecting -- one
// projection pass over the total, not one per account, so a paycheck
// landing in one account never gets counted again against another. The
// pool is anchored at the OLDEST balance_as_of among the accounts being
// summed, so the projection never assumes money arrived that a
// not-yet-updated account wouldn't have reflected yet. Savings accounts
// are just summed, no projection.
//
// This replaced an earlier "list of N accounts, link one to imported
// transactions" version (shipped same day, never used) that modeled the
// wrong problem -- linking specific bills to specific accounts. Pooling
// avoids that complexity entirely while still supporting more than one
// account.

import {
  projectRunningBalance,
  type CycleIncome,
  type CycleBill,
  type CycleDebt,
} from "./paycheckCycles"

export type CashAccountRow = {
  id: string
  kind: "checking" | "savings"
  name: string
  balance: number
  balance_as_of: string // ISO date
}

export type StartingCashSource = "lastPaycheck" | "checking"

export type StartingCash = {
  amount: number
  source: StartingCashSource
  // The (oldest) balance_as_of date among the pooled checking accounts --
  // lets the UI say "as of Sept 1, projected to today" instead of implying
  // a live balance.
  asOf: string | null
}

export function resolveStartingCash(
  checkingRows: CashAccountRow[],
  input: { income: CycleIncome[]; bills: CycleBill[]; debts: CycleDebt[]; todayISO: string },
  lastPaycheckAmount: number
): StartingCash {
  if (checkingRows.length === 0) {
    return { amount: lastPaycheckAmount, source: "lastPaycheck", asOf: null }
  }
  const pooledBalance = checkingRows.reduce((sum, r) => sum + Number(r.balance), 0)
  const anchorDateISO = checkingRows.reduce(
    (oldest, r) => (r.balance_as_of < oldest ? r.balance_as_of : oldest),
    checkingRows[0].balance_as_of
  )
  const amount = projectRunningBalance({
    anchorBalance: pooledBalance,
    anchorDateISO,
    asOfISO: input.todayISO,
    income: input.income,
    bills: input.bills,
    debts: input.debts,
  })
  return { amount, source: "checking", asOf: anchorDateISO }
}

// Sums a set of account rows as-is (no projection) -- used for Savings,
// and for showing each kind's pooled total in the editor UI.
export function poolBalance(rows: CashAccountRow[]): number {
  return Math.round(rows.reduce((sum, r) => sum + Number(r.balance), 0) * 100) / 100
}
