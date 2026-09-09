// lib/accountSafeToSpend.ts
//
// Per-checking-account Safe to Spend / This Month / Extra Debt Payment.
//
// Sep 9 2026, Vince, after the "What's committed" reconciliation fix
// shipped: "the safe to spend is not correct. I do not have $2,421.88 that
// is safe to spend. If I spend all that money then I will not have enough
// for the car payment, personal loan that come later in the month... 53rd
// only gets $1660 per paycheck to save and pay those three large amounts.
// The chime account gets the rest to pay utilities and credit cards."
//
// Root cause: lib/safeToSpend.ts, lib/monthlySafeToSpend.ts and
// lib/debtPayoffSafety.ts are all deliberately pooled -- every checking
// account's balance summed into one number (lib/cashBalance.ts's
// resolveStartingCash), every bill/debt subtracted from that one pool. That
// is the right model for someone with a single checking account, but it's
// actively wrong for someone who -- like Vince -- deliberately keeps
// separate accounts for separate obligations: it lets the app call money
// "safe to spend" out of Chime when that dollar is actually sitting in
// 53rd, earmarked for a mortgage/car/personal-loan payment landing later
// this month.
//
// The data model already has everything needed to fix this: bills, debts
// and income all carry cash_account_id (added Sep 4 2026 for
// lib/cashBalance.ts's per-account balance projection -- see
// projectAccountBalance there), it just wasn't being used by Safe to
// Spend/This Month/Extra Debt Payment themselves, only by the raw balance
// shown on the CashBalanceEditor. This file is the first thing that
// actually runs those three engines PER account instead of once, pooled.
//
// Deliberately opt-in, not a replacement of the pooled engines: this only
// activates when there's real evidence of account-level budgeting (2+
// checking accounts, with something actually linked to at least 2 of
// them) -- see shouldSplitByAccount. Everyone who hasn't split their
// bills/debts/income across specific accounts keeps seeing exactly the
// pooled numbers they always have; lib/safeToSpend.ts,
// lib/monthlySafeToSpend.ts and lib/debtPayoffSafety.ts themselves are
// UNCHANGED, this file just calls each of them once per account instead of
// once for everyone.
//
// Goal contributions are deliberately NOT split per account --
// financial_goals has no cash_account_id column, so there's no real
// "which account funds this goal" to divide by. Returned as one combined
// figure the caller can show as a shared line underneath the per-account
// cards instead of guessed at.
//
// NOT yet wired into: Paycheck Shield's cycle-by-cycle forecast
// (lib/planResilience.ts), Paycheck Capacity / "If this paycheck could
// talk" (lib/paycheckCapacity.ts), Paycheck Surplus (lib/paycheckSurplus.ts)
// or Plan Drift (lib/planDrift.ts) -- all four still project the pooled
// total. That's a known, deliberate scope cut for this round (flagged to
// Vince), not an oversight: fixing those too means re-deriving multi-cycle
// projections per account, a bigger change than the immediate contradiction
// he caught (Safe to Spend / This Month / Extra Debt Payment, the three
// numbers on the page he screenshotted).

import {
  computeSafeToSpend,
  withStartingCash,
  floorSafeToSpend,
  type SafeToSpendResult,
  type STSIncome,
  type STSBill,
  type STSDebt,
} from "./safeToSpend"
import { computeMonthlySafeToSpend, type MonthlySafeToSpendResult } from "./monthlySafeToSpend"
import {
  computeDebtPayoffAffordability,
  computeMultiCycleFloor,
  type DebtPayoffAffordability,
} from "./debtPayoffSafety"
import {
  excludeTransferCoveredDebts,
  classifyItemsAroundCycle,
  goalContributionRate,
  goalContributionMonthlyRate,
  type CycleGoal,
  type ClassifiedItem,
} from "./paycheckCycles"
import { projectAccountBalance, type CashAccountRow } from "./cashBalance"

type WithAccountLink = { cash_account_id?: string | null }
type IncomeRow = STSIncome & WithAccountLink
type BillRow = STSBill & WithAccountLink & { id?: string; name?: string }
type DebtRow = STSDebt &
  WithAccountLink & { id?: string; name?: string; covered_by_transfer?: boolean | null }

export type AccountSafeToSpend<TBill extends BillRow = BillRow, TDebt extends DebtRow = DebtRow> = {
  account: CashAccountRow
  cycle: SafeToSpendResult
  monthly: MonthlySafeToSpendResult
  affordability: DebtPayoffAffordability
  classifiedBills: ClassifiedItem<TBill>[]
  classifiedDebts: ClassifiedItem<TDebt & { amount: number }>[]
  coveredDebts: { name: string; amount: number }[]
}

export type AccountSplitResult<TBill extends BillRow = BillRow, TDebt extends DebtRow = DebtRow> = {
  // false means "this user hasn't set up account-level budgeting" -- the
  // caller should keep rendering the single pooled card exactly as before.
  // `accounts` is empty in that case; use the existing pooled
  // computeSafeToSpend/computeMonthlySafeToSpend/computeDebtPayoffAffordability
  // calls directly, unchanged.
  isSplit: boolean
  accounts: AccountSafeToSpend<TBill, TDebt>[]
  // Bills/debts not linked to any checking account at all (or linked to an
  // account that's since been deleted) -- real money the pooled total used
  // to include that a per-account split can't place anywhere. Zero for a
  // fully-tagged setup like Vince's; surfaced so a partially-tagged setup
  // never silently drops money instead of just not being split yet.
  unassignedBillsTotal: number
  unassignedDebtsTotal: number
  // Not split per account -- see file header. Shown once, combined.
  combinedGoalContribution: number
  combinedMonthlyGoalContribution: number
}

function hasLinkedItems(
  accountId: string,
  income: WithAccountLink[],
  bills: WithAccountLink[],
  debts: WithAccountLink[]
): boolean {
  return (
    income.some((i) => i.cash_account_id === accountId) ||
    bills.some((b) => b.cash_account_id === accountId) ||
    debts.some((d) => d.cash_account_id === accountId)
  )
}

// Real evidence of account-level budgeting: 2+ checking accounts, with at
// least 2 of them actually having something linked. One checking account
// with everything linked to it is just the pooled case with extra steps;
// one account with links and a second with nothing linked yet isn't a
// split the user has actually set up on the second account.
export function shouldSplitByAccount(
  checkingAccounts: CashAccountRow[],
  income: WithAccountLink[],
  bills: WithAccountLink[],
  debts: WithAccountLink[]
): boolean {
  if (checkingAccounts.length < 2) return false
  const linkedCount = checkingAccounts.filter((a) => hasLinkedItems(a.id, income, bills, debts)).length
  return linkedCount >= 2
}

export function computeAccountSplitSafeToSpend<TBill extends BillRow, TDebt extends DebtRow>(input: {
  checkingAccounts: CashAccountRow[]
  income: IncomeRow[]
  bills: TBill[]
  debts: TDebt[]
  goals: CycleGoal[]
  todayISO: string
  today?: Date
}): AccountSplitResult<TBill, TDebt> {
  const { checkingAccounts, income, bills, debts, goals, todayISO } = input
  const today = input.today ?? new Date(todayISO + "T00:00:00")

  const combinedGoalContribution = goalContributionRate(goals, income, todayISO)
  const combinedMonthlyGoalContribution = goalContributionMonthlyRate(goals, todayISO)

  const isSplit = shouldSplitByAccount(checkingAccounts, income, bills, debts)
  if (!isSplit) {
    return {
      isSplit: false,
      accounts: [],
      unassignedBillsTotal: 0,
      unassignedDebtsTotal: 0,
      combinedGoalContribution,
      combinedMonthlyGoalContribution,
    }
  }

  const knownAccountIds = new Set(checkingAccounts.map((a) => a.id))
  const unassignedBillsTotal = bills
    .filter((b) => !b.cash_account_id || !knownAccountIds.has(b.cash_account_id))
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)
  const unassignedDebtsTotal = excludeTransferCoveredDebts(
    debts.filter((d) => !d.cash_account_id || !knownAccountIds.has(d.cash_account_id)),
    income
  ).reduce((sum, d) => sum + (Number(d.minimum_payment) || 0), 0)

  const accounts: AccountSafeToSpend<TBill, TDebt>[] = checkingAccounts.map((account) => {
    const ownIncome = income.filter((i) => i.cash_account_id === account.id)
    // Falls back to every income row for SCHEDULING purposes only (finding
    // the last/next paycheck DATE) when this specific account has no income
    // linked to it yet -- a user who's split bills/debts by account but
    // hasn't split income yet still gets a real next-paycheck date instead
    // of "no income" for that account's card. The dollar amounts below
    // (billsDue/debtsDue/startingCash) only ever use this account's own
    // linked items, never the fallback income's amount.
    const scheduleIncome = ownIncome.length > 0 ? ownIncome : income
    const ownBills = bills.filter((b) => b.cash_account_id === account.id)
    const ownDebts = debts.filter((d) => d.cash_account_id === account.id)

    let cycle = computeSafeToSpend({ income: scheduleIncome, bills: ownBills, debts: ownDebts, goals: [], today })
    const projectedBalance = projectAccountBalance(account, { income, bills, debts, todayISO })
    cycle = withStartingCash(cycle, {
      amount: projectedBalance,
      source: "checking",
      asOf: account.balance_as_of,
    })

    const monthly = computeMonthlySafeToSpend({
      income: ownIncome,
      bills: ownBills,
      debts: ownDebts,
      goals: [],
      today,
    })

    const spendableOwnDebts = excludeTransferCoveredDebts(ownDebts, ownIncome)
    const spendableOwnDebtIds = new Set(spendableOwnDebts.map((d) => d.id))
    const coveredDebts = ownDebts
      .filter((d) => d.covered_by_transfer && !spendableOwnDebtIds.has(d.id))
      .map((d) => ({ name: d.name ?? "", amount: Number(d.minimum_payment) || 0 }))

    const payoffCandidates = spendableOwnDebts.map((d) => ({
      minimum_payment: d.minimum_payment,
      due_date: d.due_date,
      grace_period_days: d.grace_period_days,
      paid_through: d.paid_through,
    }))
    const affordability = computeDebtPayoffAffordability({
      startingCash: projectedBalance,
      income: scheduleIncome,
      bills: ownBills,
      debts: payoffCandidates,
      goals: [],
      today,
    })

    // "53rd is not counting the personal loan and it needs to earmark the
    // up coming mortgage payment... reduce Safe to Spend itself" (Sep 9
    // 2026, Vince, "option 1"). Runs the same multi-cycle search Extra Debt
    // Payment above already runs and pulls THIS account's own Safe to Spend
    // down to match whenever a later cycle -- Avant, the mortgage, whatever
    // else is linked to this account -- turns out tighter than the
    // immediate window. A no-op whenever, like 53rd's real numbers, this
    // account's own paycheck refill rate already outpaces what's coming due
    // later (see lib/safeToSpend.ts's floorSafeToSpend for why that's not a
    // bug -- it means the immediate number was already the true floor).
    const floor = computeMultiCycleFloor({
      startingCash: projectedBalance,
      income: scheduleIncome,
      bills: ownBills,
      debts: payoffCandidates,
      goals: [],
      today,
    })
    cycle = floorSafeToSpend(cycle, floor)

    let classifiedBills: ClassifiedItem<TBill>[] = []
    let classifiedDebts: ClassifiedItem<TDebt & { amount: number }>[] = []
    if (cycle.nextPaycheckDate) {
      classifiedBills = classifyItemsAroundCycle(ownBills, todayISO, cycle.nextPaycheckDate, cycle.lastPaycheckDate)
      classifiedDebts = classifyItemsAroundCycle(
        spendableOwnDebts.map((d) => ({ ...d, amount: d.minimum_payment })),
        todayISO,
        cycle.nextPaycheckDate,
        cycle.lastPaycheckDate
      )
    }

    return { account, cycle, monthly, affordability, classifiedBills, classifiedDebts, coveredDebts }
  })

  return {
    isSplit: true,
    accounts,
    unassignedBillsTotal,
    unassignedDebtsTotal,
    combinedGoalContribution,
    combinedMonthlyGoalContribution,
  }
}
