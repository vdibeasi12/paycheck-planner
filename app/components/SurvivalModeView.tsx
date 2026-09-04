"use client"

import Link from "next/link"
import { ArrowLeft, LifeBuoy } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { SafeToSpendResult } from "@/lib/safeToSpend"
import type { ClassifiedItem } from "@/lib/paycheckCycles"
import type { NearTermRisk, UpcomingCycleForecast } from "@/lib/planResilience"
import type { StartingCash, ProjectedCashAccountRow } from "@/lib/cashBalance"
import WhatIfSpend from "./WhatIfSpend"
import PlanRiskBanner from "./PlanRiskBanner"
import CashBalanceEditor from "./CashBalanceEditor"
import PaycheckItemBreakdown from "./PaycheckItemBreakdown"
import PaycheckLookahead from "./PaycheckLookahead"

type NamedBill = { id: string; name: string; amount: number; due_date: number | null }
type NamedDebt = { id: string; name: string; minimum_payment: number; due_date: number | null }

type Props = {
  result: SafeToSpendResult
  startingCash: StartingCash
  accounts: ProjectedCashAccountRow[]
  classifiedBills: ClassifiedItem<NamedBill>[]
  classifiedDebts: ClassifiedItem<{ id: string; name: string; amount: number; due_date: number | null }>[]
  coveredDebts?: { name: string; amount: number }[]
  risk: NearTermRisk | null
  lookahead?: UpcomingCycleForecast[]
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
 * The "survive until payday" mode -- same Safe-to-Spend numbers as the
 * Dashboard's Paycheck Countdown card, but with room to actually show its
 * work: what's already accounted for, what's still coming, an optional
 * real-balance grounding, and a heads-up when Paycheck Shield's own
 * projection sees trouble coming soon.
 */
export default function SurvivalModeView({
  result,
  startingCash,
  accounts,
  classifiedBills,
  classifiedDebts,
  coveredDebts = [],
  risk,
  lookahead = [],
}: Props) {
  const formatMoney = useFormatCurrency()

  const cantProject = !result.hasIncome || result.missingPayDate || !result.nextPaycheckDate

  const upcomingBills = classifiedBills.filter((b) => b.itemStatus === "upcoming").map((b) => ({ name: b.name, amount: b.amount, date: b.occurrenceDate }))
  const alreadyDueBills = classifiedBills.filter((b) => b.itemStatus === "alreadyDue").map((b) => ({ name: b.name, amount: b.amount, date: b.occurrenceDate }))
  const upcomingDebts = classifiedDebts.filter((d) => d.itemStatus === "upcoming").map((d) => ({ name: d.name, amount: d.amount, date: d.occurrenceDate }))
  const alreadyDueDebts = classifiedDebts.filter((d) => d.itemStatus === "alreadyDue").map((d) => ({ name: d.name, amount: d.amount, date: d.occurrenceDate }))

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
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
        <div className="mt-8 space-y-4">
          {risk && <PlanRiskBanner risk={risk} />}

          <CashBalanceEditor startingCash={startingCash} accounts={accounts} />

          {startingCash.source === "lastPaycheck" && result.transfersOut > 0 && (
            <p className="text-xs text-gray-500">
              Your last paycheck ({formatMoney(result.lastPaycheckAmount)}) minus an automatic transfer out (
              {formatMoney(result.transfersOut)}) = {formatMoney(result.startingCash)} starting cash.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Starting cash" value={formatMoney(result.startingCash)} />
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
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
              <span className="text-sm font-semibold text-emerald-200">Daily limit</span>
              <span className={`text-2xl font-bold ${result.safeToSpend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatMoney(result.dailyLimit)}/day
              </span>
            </div>
          )}

          {(upcomingBills.length > 0 || upcomingDebts.length > 0 || alreadyDueBills.length > 0 || alreadyDueDebts.length > 0) && (
            <div className="space-y-2">
              <PaycheckItemBreakdown
                title="Still to come before payday"
                hint="These are what's actually subtracted from Safe to Spend above."
                items={[...upcomingBills, ...upcomingDebts]}
                defaultOpen
              />
              <PaycheckItemBreakdown
                title="Already due earlier this cycle"
                hint="Due day already passed this month, so this is assumed already paid from your last paycheck -- not subtracted from the number above. If it hasn't actually gone out yet, your real Safe to Spend is lower than shown."
                items={[...alreadyDueBills, ...alreadyDueDebts]}
              />
            </div>
          )}

          {coveredDebts.length > 0 && (
            <PaycheckItemBreakdown
              title="Covered by an automatic transfer"
              hint="Paid from a linked account this paycheck automatically sweeps money to -- not part of what's subtracted above, so it's not double-counted."
              items={coveredDebts}
            />
          )}

          <PaycheckLookahead forecast={lookahead} />

          <div>
            <WhatIfSpend result={result} />
          </div>
        </div>
      )}
    </div>
  )
}
