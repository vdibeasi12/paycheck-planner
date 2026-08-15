"use client"

import { useMemo } from "react"
import { Wallet } from "lucide-react"
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
    <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6">
      <div className="mb-4 flex items-center gap-2">
        <Wallet size={18} className="text-emerald-400" />
        <h2 className="text-lg font-semibold text-white">Overview</h2>
      </div>

      <div className="space-y-2 text-sm leading-relaxed text-gray-300">
        {overview.summary.map((sentence, i) => (
          <p key={i}>{sentence}</p>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-800 bg-[#0b1220] p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Income</p>
          <p className="mt-1 text-lg font-bold text-emerald-400">{formatMoney(overview.monthlyIncome)}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-[#0b1220] p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Bills</p>
          <p className="mt-1 text-lg font-bold text-white">{formatMoney(overview.monthlyBills)}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-[#0b1220] p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Debt payments</p>
          <p className="mt-1 text-lg font-bold text-white">{formatMoney(overview.monthlyDebtPayments)}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-[#0b1220] p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Safe to spend</p>
          <p
            className={`mt-1 text-lg font-bold ${
              overview.safeToSpend >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatMoney(overview.safeToSpend)}
          </p>
        </div>
      </div>
    </div>
  )
}
