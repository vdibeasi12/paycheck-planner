"use client"

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
      
      <Card label="Net Worth" value={`$${netWorth.toLocaleString()}`} />

      <Card
        label="Total Debt"
        value={`$${totalDebt.toLocaleString()}`}
        valueClass="text-red-400"
      />

      <Card
        label="Monthly Payments"
        value={`$${monthlyPayments.toLocaleString()}`}
      />

      <Card
        label="Debt Progress"
        value={`${percentPaid.toFixed(0)}%`}
        valueClass="text-emerald-400"
      />

    </div>
  )
}

function Card({
  label,
  value,
  valueClass = "",
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}