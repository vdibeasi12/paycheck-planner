"use client"

import Link from "next/link"
import { ArrowLeft, LifeBuoy } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { SafeToSpendResult } from "@/lib/safeToSpend"
import WhatIfSpend from "./WhatIfSpend"

type Props = {
  result: SafeToSpendResult
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "green" | "red" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${
          accent === "green" ? "text-emerald-400" : accent === "red" ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

/**
 * The stripped-down "survive until payday" mode -- same numbers as the
 * Dashboard's Paycheck Countdown card, no other dashboard chrome around
 * them. Ties into the 30-Day Challenge content as its in-app companion.
 */
export default function SurvivalModeView({ result }: Props) {
  const formatMoney = useFormatCurrency()

  const cantProject = !result.hasIncome || result.missingPayDate || !result.nextPaycheckDate

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30">
          <LifeBuoy size={22} className="text-red-400" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Survival Mode</h1>
          <p className="text-sm text-gray-400">Just the numbers you need until your next paycheck.</p>
        </div>
      </div>

      {cantProject ? (
        <p className="mt-8 text-gray-400">
          Add your income with a pay date, plus your bills and debts, to see your survival numbers here.
        </p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <Stat label="Last paycheck" value={formatMoney(result.lastPaycheckAmount)} />
            <Stat
              label="Days until payday"
              value={result.daysUntilNextPaycheck === 0 ? "Today" : String(result.daysUntilNextPaycheck)}
            />
            <Stat label="Still due before payday" value={formatMoney(result.billsDue + result.debtsDue + result.goalContribution)} />
            <Stat
              label="Safe to spend"
              value={formatMoney(result.safeToSpend)}
              accent={result.safeToSpend >= 0 ? "green" : "red"}
            />
          </div>

          {result.dailyLimit != null && result.daysUntilNextPaycheck != null && result.daysUntilNextPaycheck > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
              <span className="text-sm font-semibold text-emerald-200">Daily limit</span>
              <span className={`text-2xl font-bold ${result.safeToSpend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatMoney(result.dailyLimit)}/day
              </span>
            </div>
          )}

          <div className="mt-6">
            <WhatIfSpend result={result} />
          </div>
        </>
      )}
    </div>
  )
}
