// lib/monthlySafeToSpend.ts
// "Committed Money" / "Financially Free Money" -- the calendar-month view of
// Safe to Spend Vince asked for on top of the existing paycheck-cycle one
// (lib/safeToSpend.ts): "It should calculate your monthly finances, from
// paycheck, bills, etc so you know what you have to spend, not paycheck to
// paycheck." Sep 5/6 2026, Vince separately compared a $4,248.51/month
// combined bills+debts total against a single paycheck and proposed a
// three-number replacement -- Current Balance / Committed Money /
// Financially Free Money. Built that way first (Sep 9 2026), on the real
// shared engine, not a second hand-rolled formula.
//
// Root cause this replaces: app/insights/page.tsx's FinancialOverviewSection
// already showed a "Safe to spend" stat tile computed by
// lib/financialOverview.ts's computeFinancialOverview() -- a simpler
// `monthlyIncome - monthlyBills - monthlySubscriptions - monthlyDebtPayments`
// that (a) never applied excludeTransferCoveredDebts, so a debt actually paid
// by an automatic transfer was double-reserved, and (b) never accounted for
// goal contributions at all. That was a second, quietly-different
// "Safe to Spend" number living in production next to the frozen
// paycheck-cycle one -- exactly the "two competing calculation systems"
// Vince has said he doesn't want. This file is the real replacement: same
// transfer-exclusion and goal-contribution logic as lib/safeToSpend.ts and
// lib/debtPayoffSafety.ts, just rolled up to a month instead of a cycle.
// computeFinancialOverview's own monthlyIncome/monthlyBills/monthlyDebtPayments
// figures are left alone for now (still used in its plain-language summary
// and the PDF narrative) -- only its "safeToSpend" field is superseded by
// this, on the new consolidated /safe-to-spend page.
//
// REVISED Sep 9 2026 (same day, Vince): compared this against Voya's public
// budget calculator (voya.com/individuals/learn/budget-calculator) and asked
// for the arithmetic to match it -- that tool computes
// `Remaining = Monthly Income - everything you've allocated` (needs + wants +
// savings, all self-declared), anchored to a stable monthly income figure.
// Financially Free Money was `currentBalance - committedMoney` -- a REAL
// balance, which moves around all month for reasons that have nothing to do
// with the budget (checked the day before payday vs. the day after gives two
// different answers even though nothing about committed money changed), so
// it never "added up" against a plain income-minus-expenses check the way
// Vince expected. Switched the formula to `monthlyIncome - committedMoney`
// to match. currentBalance is no longer an input here -- it's still exactly
// what lib/safeToSpend.ts (this cycle) and lib/debtPayoffSafety.ts (extra
// debt payment) are grounded in, just not this card anymore.

import {
  excludeTransferCoveredDebts,
  type CycleIncome,
  type CycleBill,
  type CycleDebt,
  type CycleGoal,
} from "./paycheckCycles"
import { monthlyFactor } from "./monthlyFactor"

const TRANSFER_TYPE = "transfer"

export type MSTSIncome = CycleIncome
export type MSTSBill = CycleBill
export type MSTSDebt = CycleDebt
export type MSTSGoal = CycleGoal

export type MonthlySafeToSpendResult = {
  hasIncome: boolean
  monthlyIncome: number
  monthlyBills: number
  monthlyDebtPayments: number
  // monthlyBills + monthlyDebtPayments -- what's already spoken for every
  // month before anything discretionary happens.
  //
  // CRITICAL FIX (Sep 9 2026, Vince): "don't calculate savings in safe to
  // spend" -- confirmed this applies to both cards. Goal/savings
  // contributions no longer reduce committedMoney or financiallyFreeMoney at
  // all; `goals` stays in the input type only so existing callers don't need
  // to change what they pass.
  committedMoney: number
  // monthlyIncome - committedMoney. Can be negative -- that means what's
  // already committed this month is more than you'll earn this month, a
  // real signal worth surfacing plainly rather than clamping to zero.
  financiallyFreeMoney: number
  // Debts excluded from committedMoney because a real, on-file transfer
  // already covers them (same evidence-gated rule as Safe to Spend) --
  // shown on the page so "why is my payment missing" is never a mystery.
  transferCoveredDebtNames: string[]
}

export function computeMonthlySafeToSpend(input: {
  income: MSTSIncome[]
  bills: MSTSBill[]
  debts: (MSTSDebt & { id?: string; name?: string })[]
  goals: MSTSGoal[]
  today?: Date
}): MonthlySafeToSpendResult {
  const hasIncome = input.income.length > 0

  const monthlyIncome = input.income
    .filter((i) => i.income_type !== TRANSFER_TYPE)
    .reduce((sum, i) => sum + (Number(i.amount) || 0) * monthlyFactor(i.frequency), 0)

  const monthlyBills = input.bills.reduce(
    (sum, b) => sum + (Number(b.amount) || 0) * monthlyFactor(b.frequency),
    0
  )

  const spendableDebts = excludeTransferCoveredDebts(input.debts, input.income)
  const spendableIds = new Set(spendableDebts.map((d) => d.id))
  const transferCoveredDebtNames = input.debts
    .filter((d) => d.covered_by_transfer && !spendableIds.has(d.id))
    .map((d) => d.name || "")
    .filter(Boolean)

  const monthlyDebtPayments = spendableDebts.reduce(
    (sum, d) => sum + (Number(d.minimum_payment) || 0),
    0
  )

  const committedMoney = monthlyBills + monthlyDebtPayments
  const financiallyFreeMoney = monthlyIncome - committedMoney

  return {
    hasIncome,
    monthlyIncome,
    monthlyBills,
    monthlyDebtPayments,
    committedMoney,
    financiallyFreeMoney,
    transferCoveredDebtNames,
  }
}
