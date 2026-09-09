"use client"

// app/components/MonthlySafeToSpendCard.tsx
// The monthly half of the new consolidated /safe-to-spend page (Sep 9 2026):
// Current Balance / Committed Money / Financially Free Money, per Vince's
// own Sep 5/6 critique. All the math is lib/monthlySafeToSpend.ts -- this is
// display only. Built with the new semantic theme tokens (bg-surface,
// text-primary, etc) from the start, unlike the still-dark-only
// PaycheckCountdown card it sits next to on this page.

import { PiggyBank } from "lucide-react"
import InfoHint from "./InfoHint"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { MonthlySafeToSpendResult } from "@/lib/monthlySafeToSpend"

export default function MonthlySafeToSpendCard({ result }: { result: MonthlySafeToSpendResult }) {
  const formatMoney = useFormatCurrency()

  if (!result.hasIncome) {
    return (
      <div className="rounded-2xl border border-default bg-surface p-6 shadow-lg">
        <div className="flex items-center gap-2">
          <PiggyBank size={18} className="text-emerald-400" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">This month</h2>
        </div>
        <p className="mt-2 text-muted">Add your income to see your monthly Financially Free Money.</p>
      </div>
    )
  }

  const positive = result.financiallyFreeMoney >= 0

  return (
    <div className="rounded-2xl border border-default bg-surface p-6 shadow-lg">
      <div className="flex items-center gap-2">
        <PiggyBank size={18} className="text-emerald-400" />
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">This month</h2>
        <InfoHint
          label="About Financially Free Money"
          text="Your monthly income minus everything already committed this month -- bills and debt minimums. Savings/goal contributions are never subtracted. Not the same question as Safe to Spend above: this one uses what you earn on average rather than your real balance right now, so it stays steady no matter what day of the month you check it."
        />
      </div>

      <p className={`mt-2 text-4xl font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
        {formatMoney(result.financiallyFreeMoney)}
      </p>
      <p className="mt-1 text-sm text-muted">Financially Free Money</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-subtle bg-surface-alt p-3">
          <p className="text-xs uppercase tracking-wide text-muted">Monthly income</p>
          <p className="mt-1 text-lg font-bold text-primary">{formatMoney(result.monthlyIncome)}</p>
          <p className="mt-1 text-[11px] text-muted">All recurring income, normalized to a month</p>
        </div>
        <div className="rounded-lg border border-subtle bg-surface-alt p-3">
          <p className="text-xs uppercase tracking-wide text-muted">Committed money</p>
          <p className="mt-1 text-lg font-bold text-primary">{formatMoney(result.committedMoney)}</p>
          <p className="mt-1 text-[11px] text-muted">This month, all in</p>
        </div>
      </div>

      <div className="mt-4 space-y-1.5 text-sm text-muted">
        <div className="flex justify-between">
          <span>Bills</span>
          <span className="text-secondary">-{formatMoney(result.monthlyBills)}</span>
        </div>
        <div className="flex justify-between">
          <span>Debt payments</span>
          <span className="text-secondary">-{formatMoney(result.monthlyDebtPayments)}</span>
        </div>
      </div>

      {result.transferCoveredDebtNames.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          Not counted above (paid by an automatic transfer already): {result.transferCoveredDebtNames.join(", ")}.
        </p>
      )}

      {!positive && (
        <p className="mt-3 text-sm text-red-300">
          What's committed this month is more than you'll earn this month. This can happen even when Safe to
          Spend above looks fine -- that one is grounded in your real balance right now, not your average
          monthly income.
        </p>
      )}
    </div>
  )
}
