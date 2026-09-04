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
// wrong problem -- deriving a balance from a running sum of imported CSV/
// Plaid transactions tagged with an account label. Pooling + manual
// balances avoided that fragility while still supporting more than one
// account.
//
// Per-account auto-adjust (Sep 4 2026, Vince): "have the credit cards and
// debt use transaction which will minus the amount in checking and
// savings, also add when a paycheck will be sent... so those checking plus
// savings should auto adjust" -- a DIFFERENT thing from the pooling above,
// and not the same idea the earlier attempt got wrong: that one derived a
// balance from imported transaction history; this one just extends the
// existing forward-projection (already used for the pooled total below) to
// a single named account, using only the bills/debts/income the user has
// explicitly linked to THAT account (see CycleBill/CycleDebt/
// CycleIncome.cash_account_id, set in Bills & Debts / Income). See
// projectAccountBalance below. Anything left unassigned keeps counting
// toward the pooled Safe-to-Spend total here (unaffected, unfiltered) but
// won't move any single account's own number until it's linked.

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

// A CashAccountRow with its own auto-adjusted balance attached (see
// projectAccountBalance below) -- what CashBalanceEditor actually renders.
// `balance`/`balance_as_of` stay the last real number the user typed in
// (the anchor); `projectedBalance` is that anchor carried forward to today
// using whatever's linked to this specific account.
export type ProjectedCashAccountRow = CashAccountRow & { projectedBalance: number }

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

// Sums a set of account rows as-is (no projection) -- used as the fallback
// pooled total when nothing is linked to any account yet (see
// CashBalanceEditor, which prefers the sum of projectAllAccountBalances
// below once at least one bill/debt/income is actually linked).
export function poolBalance(rows: CashAccountRow[]): number {
  return Math.round(rows.reduce((sum, r) => sum + Number(r.balance), 0) * 100) / 100
}

export type AccountProjectionInput = {
  income: CycleIncome[]
  bills: CycleBill[]
  debts: CycleDebt[]
  todayISO: string
}

// One account's own balance, projected forward from its own anchor
// (balance/balance_as_of) using only the bills/debts/income actually linked
// to it (cash_account_id) -- the single-account counterpart to
// resolveStartingCash's pooled projection above. Works for Savings too now
// that a debt or a paycheck can be linked to one (previously nothing in
// this app's data model ever scheduled a savings movement).
export function projectAccountBalance(account: CashAccountRow, input: AccountProjectionInput): number {
  const isMine = (id: string | null | undefined) => id === account.id
  return projectRunningBalance({
    anchorBalance: Number(account.balance),
    anchorDateISO: account.balance_as_of,
    asOfISO: input.todayISO,
    income: input.income.filter((i) => isMine(i.cash_account_id)),
    bills: input.bills.filter((b) => isMine(b.cash_account_id)),
    debts: input.debts.filter((d) => isMine(d.cash_account_id)),
  })
}

// projectAccountBalance for every account at once, keyed by account id --
// what CashBalanceEditor actually renders per row.
export function projectAllAccountBalances(
  accounts: CashAccountRow[],
  input: AccountProjectionInput
): Map<string, number> {
  return new Map(accounts.map((a) => [a.id, projectAccountBalance(a, input)]))
}
