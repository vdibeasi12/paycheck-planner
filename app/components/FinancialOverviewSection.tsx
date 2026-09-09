"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Wallet, ArrowRight } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import {
  computeFinancialOverview,
  type OverviewIncome,
  type OverviewBill,
  type OverviewDebt,
} from "@/lib/financialOverview"

type Props = {
  income: OverviewIncome[]
  bills: OverviewBill[]
  debts: OverviewDebt[]
}

// Phase C, per the plan agreed with Vince ("I want the reporting to have a
// clear breakdown to show the overview"): /insights was two pie charts and
// nothing else -- no plain-language summary anywhere in the app. This is
// that summary. Pure display -- all the actual math lives in
// lib/financialOverview.ts so this, the PDF export, and the Dashboard can
// never disagree with each other.
export default function FinancialOverviewSection({ income, bills, debts }: Props) {
  const formatMoney = useFormatCurrency()

  const overview = useMemo(
    () => computeFinancialOverview({ income, bills, debts, formatMoney }),
    [income, bills, debts, formatMoney]
  )

  return (
    <div className="rounded-2xl border border-default bg-surface p-6">
      <div className="mb-4 flex items-center gap-2">
        <Wallet size={18} className="text-emerald-400" />
        <h2 className="text-lg font-semibold text-primary">Overview</h2>
      </div>

      <div className="space-y-2 text-sm leading-relaxed text-secondary">
        {overview.summary.map((sentence, i) => (
          <p key={i}>{sentence}</p>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-subtle bg-surface-alt p-3">
          <p className="text-xs uppercase tracking-wide text-muted">Income</p>
          <p className="mt-1 text-lg font-bold text-emerald-400">{formatMoney(overview.monthlyIncome)}</p>
        </div>
        <div className="rounded-lg border border-subtle bg-surface-alt p-3">
          <p className="text-xs uppercase tracking-wide text-muted">Bills</p>
          <p className="mt-1 text-lg font-bold text-primary">{formatMoney(overview.monthlyBills)}</p>
        </div>
        <div className="rounded-lg border border-subtle bg-surface-alt p-3">
          <p className="text-xs uppercase tracking-wide text-muted">Debt payments</p>
          <p className="mt-1 text-lg font-bold text-primary">{formatMoney(overview.monthlyDebtPayments)}</p>
        </div>
      </div>

      {/* Sep 9 2026, Vince: root-caused during the light/dark + consolidation
          work -- this tile used to show computeFinancialOverview's own
          "safeToSpend" (income - bills - subscriptions - debt payments,
          lib/financialOverview.ts), a second, quietly different number from
          the real paycheck-cycle/monthly engines shown everywhere else (it
          never applied excludeTransferCoveredDebts and ignored goal
          contributions entirely). Removed rather than fixed in place --
          fixing it here would just be a THIRD implementation of the same
          idea. The real numbers live on the one consolidated page now. */}
      <Link
        href="/safe-to-spend"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:underline"
      >
        See Safe to Spend (this cycle, this month, and extra debt payment) <ArrowRight size={14} />
      </Link>
    </div>
  )
}
