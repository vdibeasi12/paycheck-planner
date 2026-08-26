"use client"

import { GitCompare } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { PlanBreakdown, DriftResult, DriftCategory } from "@/lib/planDrift"

type Props = {
  planned: PlanBreakdown | null
  current: PlanBreakdown | null
  drift: DriftResult | null
}

const CATEGORY_LABEL: Record<DriftCategory, string> = {
  bills: "Bills",
  debts: "Debt",
  goals: "Goals",
  flexible: "Flexible",
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function Row({
  label,
  planned,
  current,
  formatMoney,
}: {
  label: string
  planned: number
  current: number
  formatMoney: (n: number) => string
}) {
  const delta = current - planned
  const moved = Math.abs(delta) >= 0.01
  return (
    <div className="grid grid-cols-3 items-center gap-2 py-2 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-right text-gray-500">{formatMoney(planned)}</span>
      <span className={`text-right font-medium ${moved ? (delta > 0 ? "text-amber-400" : "text-sky-400") : "text-gray-200"}`}>
        {formatMoney(current)}
      </span>
    </div>
  )
}

/**
 * "Plan Drift" -- not a transaction alert, and not a stress test. It answers
 * one question: are you still following the plan you started this pay
 * period with? planned is frozen the moment the cycle starts
 * (app/dashboard/page.tsx); current is recomputed live from today's real
 * bills/debts/goals for that same window (lib/planDrift.ts).
 */
export default function PlanDriftView({ planned, current, drift }: Props) {
  const formatMoney = useFormatCurrency()

  const header = (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
        <GitCompare size={22} className="text-emerald-400" />
      </span>
      <div>
        <h1 className="text-2xl font-bold text-white">Plan Drift</h1>
        <p className="text-sm text-gray-400">Are you still following the plan you started this pay period with?</p>
      </div>
    </div>
  )

  if (!planned) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {header}
        <p className="text-gray-400">
          Nothing to compare yet. The moment your next paycheck arrives, Plan Drift freezes what it needs to cover --
          come back partway through that pay period to see whether anything's shifted.
        </p>
      </div>
    )
  }

  if (!current || !drift) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {header}
        <p className="text-gray-400">
          Your {formatDate(planned.cycleDate)} paycheck's plan couldn't be recomputed right now -- add your income's
          pay date if it's missing, then check back.
        </p>
      </div>
    )
  }

  const narrative = (() => {
    const shift = drift.biggestShift
    if (!shift) return "Right on plan so far this pay period -- nothing's shifted."
    const amount = formatMoney(Math.abs(shift.delta))
    const label = CATEGORY_LABEL[shift.category]
    return shift.delta < 0
      ? `You've redirected ${amount} away from ${label} toward flexible spending this pay period.`
      : `You've redirected ${amount} from flexible spending toward ${label} this pay period.`
  })()

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      {header}

      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-6 shadow-lg">
        <p className="text-sm text-gray-400">Since your {formatDate(planned.cycleDate)} paycheck</p>
        <p className="mt-2 text-white">{narrative}</p>
        <p className="mt-3 text-xs text-gray-500">
          Plan drift: <span className="text-gray-300">{formatMoney(drift.totalDrift)}</span> moved across bills, debt,
          and goals combined.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-700 bg-[#0b1220] p-6">
        <div className="grid grid-cols-3 gap-2 border-b border-gray-800 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <span></span>
          <span className="text-right">Original</span>
          <span className="text-right">Current</span>
        </div>
        <Row label="Bills" planned={planned.billsAmount} current={current.billsAmount} formatMoney={formatMoney} />
        <Row label="Debt" planned={planned.debtsAmount} current={current.debtsAmount} formatMoney={formatMoney} />
        <Row label="Goals" planned={planned.goalsAmount} current={current.goalsAmount} formatMoney={formatMoney} />
        <div className="mt-1 border-t border-gray-800 pt-2">
          <Row
            label="Flexible"
            planned={planned.flexibleAmount}
            current={current.flexibleAmount}
            formatMoney={formatMoney}
          />
        </div>
      </div>
    </div>
  )
}
