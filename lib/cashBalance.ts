// lib/cashBalance.ts
// Resolves the most accurate "what do I actually have to spend from right
// now" figure available, for Safe to Spend / Survival Mode. Plaid Auth
// (live checking balance) was denied for Production, so these numbers have
// always projected a starting-cash figure from "your last paycheck" --
// this file lets that be replaced with something grounded in reality when
// the user provides it, without ever touching a live bank connection.
//
// Three possible sources, most to least accurate:
//   1. linkedAccount -- an imported account's transaction-verified running
//      balance (starting_balance + net of every transaction tagged with
//      that account label). Same mechanism as a linked savings Goal, see
//      lib/goalAutoCalc.ts.
//   2. manualBalance -- a number the user typed in themselves.
//   3. lastPaycheck -- the original projection-only fallback, unchanged
//      for anyone who never touches this feature.

export type CashBalanceRow = {
  manual_balance: number | null
  manual_balance_updated_at: string | null
  linked_account_label: string | null
  linked_starting_balance: number | null
}

export type StartingCashSource = "lastPaycheck" | "manualBalance" | "linkedAccount"

export type StartingCash = {
  amount: number
  source: StartingCashSource
  // Account label for linkedAccount; ISO timestamp of the last manual update
  // for manualBalance; null for lastPaycheck.
  label: string | null
}

export function resolveStartingCash(
  row: CashBalanceRow | null,
  linkedAccountTransactionSum: number | null,
  lastPaycheckAmount: number
): StartingCash {
  if (row?.linked_account_label && linkedAccountTransactionSum != null) {
    return {
      amount: Math.round((Number(row.linked_starting_balance || 0) + linkedAccountTransactionSum) * 100) / 100,
      source: "linkedAccount",
      label: row.linked_account_label,
    }
  }
  if (row?.manual_balance != null) {
    return {
      amount: Number(row.manual_balance),
      source: "manualBalance",
      label: row.manual_balance_updated_at ?? null,
    }
  }
  return { amount: lastPaycheckAmount, source: "lastPaycheck", label: null }
}
