import InfoHint from "./InfoHint"
import { Wallet } from "lucide-react"

type Props = {
  monthlyIncome: number
  monthlyBills: number
  monthlyDebt: number
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })

export default function SafeToSpend({ monthlyIncome, monthlyBills, monthlyDebt }: Props) {
  const safe = monthlyIncome - monthlyBills - monthlyDebt
  const hasIncome = monthlyIncome > 0
  const positive = safe >= 0

  return (
    <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-6 shadow-lg">
      <div className="flex items-center gap-2">
        <Wallet size={18} className="text-emerald-400" />
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">
          Safe to spend this month
        </h2>
        <InfoHint
          label="About Safe to Spend"
          text="What's left after your monthly income minus recurring bills and minimum debt payments. Roughly what you can spend without falling behind."
        />
      </div>

      {hasIncome ? (
        <>
          <p className={`mt-2 text-4xl font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
            {fmt(safe)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400">
            <span className="text-gray-300">{fmt(monthlyIncome)} income</span>
            <span>-</span>
            <span className="text-gray-300">{fmt(monthlyBills)} bills</span>
            <span>-</span>
            <span className="text-gray-300">{fmt(monthlyDebt)} debt payments</span>
          </div>
          {!positive && (
            <p className="mt-3 text-sm text-red-300">
              Your fixed costs exceed your income this month. Consider trimming bills or revisiting your debt plan.
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-gray-400">
          Add your income to see how much is safe to spend after bills and debt.
        </p>
      )}
    </div>
  )
}