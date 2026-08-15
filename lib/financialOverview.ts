// lib/financialOverview.ts
// Phase C (reporting overview), per the plan agreed with Vince: a pure,
// unit-testable computation module so the "clear breakdown" narrative on
// /insights and the eventual PDF narrative page (lib/generateSummaryPdf.ts)
// can never drift apart -- both call this, neither re-derives the numbers
// itself. Mirrors the exact same income/bills/debt logic already used on
// app/dashboard/page.tsx (transfer-exclusion, subscriptions split, escrow
// exclusion) so Insights and the Dashboard always agree.

import { monthlyFactor } from "./monthlyFactor"

const TRANSFER_TYPE = "transfer"
const SUBSCRIPTION_CATEGORY = "Subscriptions"

export type OverviewIncome = {
  amount: number
  frequency?: string | null
  income_type?: string | null
}

export type OverviewBill = {
  amount: number
  frequency?: string | null
  category?: string | null
}

export type OverviewDebt = {
  balance: number
  minimum_payment: number
  // Not subtracted here -- Safe-to-Spend and this overview both care about
  // real cash leaving the account every month, escrow included. Only the
  // Payoff Plan's amortization math (lib/payoffSimulate.ts) needs the P&I
  // split.
  escrow_payment?: number | null
}

export type FinancialOverview = {
  monthlyIncome: number
  monthlyBills: number
  monthlySubscriptions: number
  monthlyDebtPayments: number
  totalDebtBalance: number
  activeDebtCount: number
  safeToSpend: number
  // Plain-language sentences, in display order -- the "clear breakdown"
  // itself. Kept as an array (not one paragraph) so each renders as its
  // own line/paragraph in the UI and PDF without re-splitting the text.
  summary: string[]
}

export function computeFinancialOverview(input: {
  income: OverviewIncome[]
  bills: OverviewBill[]
  debts: OverviewDebt[]
  formatMoney: (n: number) => string
}): FinancialOverview {
  const { formatMoney } = input

  // Same exclusion as app/dashboard/page.tsx and app/income/page.tsx -- a
  // "transfer" row is money moving between the user's own accounts, not
  // real income.
  const monthlyIncome = input.income
    .filter((i) => i.income_type !== TRANSFER_TYPE)
    .reduce((sum, i) => sum + (Number(i.amount) || 0) * monthlyFactor(i.frequency), 0)

  const regularBills = input.bills.filter((b) => b.category !== SUBSCRIPTION_CATEGORY)
  const subscriptionBills = input.bills.filter((b) => b.category === SUBSCRIPTION_CATEGORY)

  const monthlyBills = regularBills.reduce(
    (sum, b) => sum + (Number(b.amount) || 0) * monthlyFactor(b.frequency),
    0
  )
  const monthlySubscriptions = subscriptionBills.reduce(
    (sum, b) => sum + (Number(b.amount) || 0) * monthlyFactor(b.frequency),
    0
  )

  const activeDebts = input.debts.filter((d) => (Number(d.balance) || 0) > 0)
  const monthlyDebtPayments = activeDebts.reduce(
    (sum, d) => sum + (Number(d.minimum_payment) || 0),
    0
  )
  const totalDebtBalance = activeDebts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0)

  const safeToSpend = monthlyIncome - monthlyBills - monthlySubscriptions - monthlyDebtPayments

  const summary: string[] = []

  if (monthlyIncome === 0 && input.bills.length === 0 && input.debts.length === 0) {
    summary.push(
      "Add your income, bills, and debts to see a plain-language breakdown of your money here."
    )
    return {
      monthlyIncome,
      monthlyBills,
      monthlySubscriptions,
      monthlyDebtPayments,
      totalDebtBalance,
      activeDebtCount: activeDebts.length,
      safeToSpend,
      summary,
    }
  }

  summary.push(
    monthlyIncome > 0
      ? `You bring in about ${formatMoney(monthlyIncome)} a month, not counting transfers between your own accounts.`
      : `No income is tracked yet, so the numbers below assume $0 coming in.`
  )

  const obligationParts: string[] = []
  if (monthlyBills > 0) obligationParts.push(`${formatMoney(monthlyBills)} in bills`)
  if (monthlySubscriptions > 0) obligationParts.push(`${formatMoney(monthlySubscriptions)} in subscriptions`)
  if (monthlyDebtPayments > 0) obligationParts.push(`${formatMoney(monthlyDebtPayments)} in debt payments`)
  if (obligationParts.length > 0) {
    summary.push(`Each month you're committed to ${obligationParts.join(", ")}.`)
  }

  if (activeDebts.length > 0) {
    summary.push(
      `You're carrying ${formatMoney(totalDebtBalance)} across ${activeDebts.length} ${
        activeDebts.length === 1 ? "debt" : "debts"
      } -- see the Payoff Plan for exactly when each one is projected to be paid off.`
    )
  }

  if (safeToSpend >= 0) {
    summary.push(
      `After bills, subscriptions, and debt payments, you have about ${formatMoney(
        safeToSpend
      )} a month of safe-to-spend room.`
    )
  } else {
    summary.push(
      `Your bills, subscriptions, and debt payments add up to about ${formatMoney(
        Math.abs(safeToSpend)
      )} more than your tracked income each month -- worth double-checking that everything above is accurate and up to date.`
    )
  }

  return {
    monthlyIncome,
    monthlyBills,
    monthlySubscriptions,
    monthlyDebtPayments,
    totalDebtBalance,
    activeDebtCount: activeDebts.length,
    safeToSpend,
    summary,
  }
}
