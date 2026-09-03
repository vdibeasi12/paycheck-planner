// lib/cashBalance.ts
// Resolves the most accurate "what do I actually have to spend from right
// now" figure available, for Safe to Spend / Survival Mode. Plaid Auth
// (live checking balance) was denied for Production, so these numbers have
// always projected a starting-cash figure from "your last paycheck" -- this
// file lets that be replaced with something grounded in reality when the
// user provides it, without ever touching a live bank connection.
//
// QA fix (Sep 3 2026, Vince): a single balance can't represent a real
// household -- bills might come out of one bank while a mortgage/car/
// personal loan come out of another, and a savings/cushion account should
// never be counted as spendable money. So this is now a LIST of accounts
// (cash_accounts table, one row per account the user actually spends bills
// from), summed together. Anything the user wants tracked but NOT counted
// toward Safe to Spend (a savings account, a cushion goal) simply isn't
// added here -- it can be tracked instead via a linked Financial Goal (see
// lib/goalAutoCalc.ts), which is a better fit for "money I'm growing" than
// "money I have to spend."
//
// Each account resolves its own balance from one of two sources, most to
// least "sticky":
//   1. linkedAccount -- an imported account's transaction-verified running
//      balance (starting_balance + net of every transaction tagged with
//      that account label). Updates itself on every statement import.
//   2. manualBalance -- a number the user typed in themselves, current as
//      of whenever they last checked their bank.
// With zero accounts added, Safe to Spend falls back to the original
// lastPaycheck projection, unchanged for anyone who never touches this.

export type CashAccountRow = {
  id: string
  label: string
  manual_balance: number | null
  manual_balance_updated_at: string | null
  linked_account_label: string | null
  linked_starting_balance: number
}

export type ResolvedCashAccount = {
  id: string
  label: string
  balance: number
  isLinked: boolean
  updatedAt: string | null
}

export type StartingCashSource = "lastPaycheck" | "accounts"

export type StartingCash = {
  amount: number
  source: StartingCashSource
  // A friendly description of what fed the total -- the single account's
  // name, "N accounts", or null for the lastPaycheck fallback.
  label: string | null
  accounts: ResolvedCashAccount[]
}

// Resolves one account row to its current balance. `linkedTransactionSum`
// is the sum of transactions.amount for that row's linked_account_label,
// or null when the row isn't linked to an imported account.
export function resolveAccountBalance(
  row: CashAccountRow,
  linkedTransactionSum: number | null
): ResolvedCashAccount {
  if (row.linked_account_label && linkedTransactionSum != null) {
    return {
      id: row.id,
      label: row.label,
      balance: Math.round((Number(row.linked_starting_balance || 0) + linkedTransactionSum) * 100) / 100,
      isLinked: true,
      updatedAt: null,
    }
  }
  return {
    id: row.id,
    label: row.label,
    balance: Number(row.manual_balance ?? 0),
    isLinked: false,
    updatedAt: row.manual_balance_updated_at ?? null,
  }
}

export function resolveStartingCash(accounts: ResolvedCashAccount[], lastPaycheckAmount: number): StartingCash {
  if (accounts.length === 0) {
    return { amount: lastPaycheckAmount, source: "lastPaycheck", label: null, accounts: [] }
  }
  const amount = Math.round(accounts.reduce((sum, a) => sum + a.balance, 0) * 100) / 100
  const label = accounts.length === 1 ? accounts[0].label : `${accounts.length} accounts`
  return { amount, source: "accounts", label, accounts }
}
