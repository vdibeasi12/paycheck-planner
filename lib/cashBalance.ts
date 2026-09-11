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
  // a live balance. DISPLAY ONLY. It is the date the user last typed a
  // number in, which is NOT the date `amount` above is accurate as of.
  asOf: string | null
  // CRITICAL FIX (Sep 11 2026, found in a full-codebase audit): the date
  // `amount` is actually accurate as of, which after projectRunningBalance
  // has carried it forward is TODAY, not the anchor.
  //
  // Conflating the two double-subtracted every obligation falling between
  // the anchor and today. resolveStartingCash already deducted them while
  // projecting the balance forward; callers then passed `asOf` (the older
  // anchor) as projectBalanceTimeline's balanceAsOfISO, so those same
  // obligations failed the "already inside this balance" test and were
  // applied a SECOND time as past-due. Reproduced: a $3,000 balance dated
  // Sep 1 with a $500 bill due Sep 5, read on Sep 11, resolved to $2,500
  // correctly and then reported $2,000 safe to spend.
  //
  // Anything doing math with the balance must use this; anything printing
  // "as of <date>" for a human must use `asOf`.
  effectiveAsOf?: string | null
}

// Anything linked to one of these accounts is savings money and is excluded
// from every spendable figure below -- see resolveStartingCash's comment.
type WithAccount = { cash_account_id?: string | null }
function excludeSavingsLinked<T extends WithAccount>(rows: T[], savingsAccountIds?: string[] | null): T[] {
  if (!savingsAccountIds || savingsAccountIds.length === 0) return rows
  const savings = new Set(savingsAccountIds)
  return rows.filter((r) => !r.cash_account_id || !savings.has(r.cash_account_id))
}

export function resolveStartingCash(
  checkingRows: CashAccountRow[],
  input: {
    income: CycleIncome[]
    bills: CycleBill[]
    debts: CycleDebt[]
    todayISO: string
    // CRITICAL FIX (Sep 11 2026, Vince): "stop counting the savings in Chime,
    // that is for emergency money only not part of safe to spend... it's not
    // to be used to pay bills or debt."
    //
    // The anchor balance above has always been checking-only, but the
    // projection carrying it forward to today was fed EVERY income, bill and
    // debt row regardless of which account it belongs to. So a paycheck
    // deposited into savings was added to the checking pool, and a bill
    // linked to savings was subtracted from it -- savings money leaking into
    // and out of a "checking" figure in both directions. Nothing of Vince's
    // is linked to savings today, so this wasn't visibly wrong yet, but the
    // app offers savings accounts in the account pickers, so it was one
    // dropdown selection away from being wrong and silently so.
    //
    // Pass every savings account's id here and anything linked to one is left
    // out. Rows with NO account linked still count, deliberately and exactly
    // as before (see CycleIncome.cash_account_id) -- "not assigned yet" means
    // "counts toward the pooled total," not "belongs to savings."
    savingsAccountIds?: string[] | null
  },
  lastPaycheckAmount: number
): StartingCash {
  if (checkingRows.length === 0) {
    return { amount: lastPaycheckAmount, source: "lastPaycheck", asOf: null, effectiveAsOf: null }
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
    income: excludeSavingsLinked(input.income, input.savingsAccountIds),
    bills: excludeSavingsLinked(input.bills, input.savingsAccountIds),
    debts: excludeSavingsLinked(input.debts, input.savingsAccountIds),
  })
  return { amount, source: "checking", asOf: anchorDateISO, effectiveAsOf: input.todayISO }
}

// The savings account ids out of a full account list -- what every caller of
// resolveStartingCash should hand it. Exported so no page has to re-derive
// (and mistype) the filter.
export function savingsAccountIdsOf(rows: CashAccountRow[]): string[] {
  return rows.filter((r) => r.kind === "savings").map((r) => r.id)
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
