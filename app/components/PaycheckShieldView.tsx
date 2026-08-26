"use client"

import { Shield, TrendingDown } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { PlanResilienceResult } from "@/lib/planResilience"
import StressTestPanel from "./StressTestPanel"
import StrengthenPaycheckPanel from "./StrengthenPaycheckPanel"

type BillRow = { id: string; name: string; amount: number; due_date: number | null }
type DebtRow = { id: string; name: string; minimum_payment: number; due_date: number | null }

type Props = {
  result: PlanResilienceResult
  bills: BillRow[]
  debts: DebtRow[]
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function strengthLabel(score: number): { label: string; className: string } {
  if (score >= 80) return { label: "STRONG", className: "text-emerald-400" }
  if (score >= 50) return { label: "OK", className: "text-amber-400" }
  return { label: "VULNERABLE", className: "text-red-400" }
}

/**
 * Paycheck Shield -- stress-tests the paycheck plan lib/planResilience.ts
 * already projects from income/bills/debts/goals. The question isn't "how
 * much money do I have," it's "how much can this plan withstand before a
 * specific paycheck comes up short." No bank transaction feed involved.
 */
export default function PaycheckShieldView({ result, bills, debts }: Props) {
  const formatMoney = useFormatCurrency()

  if (!result.hasPlan) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
            <Shield size={22} className="text-emerald-400" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-white">Paycheck Shield</h1>
            <p className="text-sm text-gray-400">Stress-test your paycheck plan against real life.</p>
          </div>
        </div>
        <p className="mt-8 text-gray-400">
          Add your income with a pay date, plus your bills and debts, to see how your plan holds up.
        </p>
      </div>
    )
  }

  const strength = strengthLabel(result.strengthScore)
  const upcomingCycles = result.cycles.slice(0, 6)

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
          <Shield size={22} className="text-emerald-400" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Paycheck Shield</h1>
          <p className="text-sm text-gray-400">How strong is your current paycheck plan?</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-6 shadow-lg">
        <div className="flex items-end gap-3">
          <span className="text-5xl font-bold text-white">{result.strengthScore}</span>
          <span className="pb-1 text-gray-500">/ 100</span>
          <span className={`pb-1.5 ml-1 text-sm font-bold tracking-wide ${strength.className}`}>{strength.label}</span>
        </div>
        <p className="mt-2 text-sm text-gray-400">
          Based on how {result.scenarioResults.length} common real-life scenarios play out against your next{" "}
          {upcomingCycles.length} paychecks. Not an industry benchmark -- just a way to see where your plan has slack
          and where it doesn't.
        </p>
      </div>

      {result.weakestCycle && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
          <div className="flex items-center gap-2 text-amber-300">
            <TrendingDown size={18} />
            <h2 className="text-sm font-semibold uppercase tracking-wide">Your weak point</h2>
          </div>
          <p className="mt-2 text-white">
            Your {formatDate(result.weakestCycle.date)} paycheck has the least room -- expected{" "}
            {formatMoney(result.weakestCycle.amount)}, with {formatMoney(
              result.weakestCycle.billsDue + result.weakestCycle.debtsDue + result.weakestCycle.goalContribution
            )}{" "}
            already committed, leaving{" "}
            <span className={result.weakestCycle.cushion >= 0 ? "text-emerald-300" : "text-red-300"}>
              {formatMoney(result.weakestCycle.cushion)}
            </span>{" "}
            of cushion.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-gray-700 bg-[#0b1220] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Upcoming paychecks</h2>
        <div className="space-y-1.5">
          {upcomingCycles.map((c) => {
            const isWeakest = result.weakestCycle && c.date === result.weakestCycle.date
            const committed = c.billsDue + c.debtsDue + c.goalContribution
            return (
              <div
                key={c.date}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  isWeakest ? "bg-amber-500/10 border border-amber-500/20" : ""
                }`}
              >
                <span className="text-gray-300 w-20">{formatDate(c.date)}</span>
                <span className="text-gray-500 flex-1 text-right pr-4">-{formatMoney(committed)} committed</span>
                <span className={`font-semibold w-24 text-right ${c.cushion >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatMoney(c.cushion)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <StressTestPanel scenarioResults={result.scenarioResults} />

      {result.weakestCycle && (
        <StrengthenPaycheckPanel cycle={result.weakestCycle} bills={bills} debts={debts} />
      )}
    </div>
  )
}
