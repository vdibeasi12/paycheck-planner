"use client"

import InfoHint from "./InfoHint"

type Props = {
  netWorth: number
  totalDebt: number
  monthlyPayments: number
  percentPaid: number
}

export default function SummaryCards({
  netWorth,
  totalDebt,
  monthlyPayments,
  percentPaid,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

      <Card
        label="Net Worth"
        value={`$${netWorth.toLocaleString()}`}
        hint="Everything you own minus everything you owe. Until you track assets, this mirrors your total debt as a negative number."
      />

      <Card
        label="Total Debt"
        value={`$${totalDebt.toLocaleString()}`}
        valueClass="text-red-400"
        hint="The combined balance across every debt you've added. Watch this shrink as you pay things down."
      />

      <Card
        label="Monthly Payments"
        value={`$${monthlyPayments.toLocaleString()}`}
        hint="The total of the minimum payments due across all your debts each month."
      />

      <Card
        label="Debt Progress"
        value={`${percentPaid.toFixed(0)}%`}
        valueClass="text-emerald-400"
        hint="How much of your starting debt you've paid off so far. Hits 100% when you're debt-free."
      />

    </div>
  )
}

function Card({
  label,
  value,
  valueClass = "",
  hint,
}: {
  label: string
  value: string
  valueClass?: string
  hint?: string
}) {
  return (
    <div className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg transition hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-800/60 hover:shadow-xl">
      <div className="flex items-center gap-1.5">
        <p className="text-sm text-slate-400">{label}</p>
        {hint && <InfoHint text={hint} label={`About ${label}`} />}
      </div>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}
