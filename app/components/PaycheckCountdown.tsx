"use client"

import Link from "next/link"
import InfoHint from "./InfoHint"
import { Wallet, CalendarClock } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { SafeToSpendResult } from "@/lib/safeToSpend"
import type { ClassifiedItem } from "@/lib/paycheckCycles"
import type { NearTermRisk } from "@/lib/planResilience"
import type { StartingCash } from "@/lib/cashBalance"
import PlanRiskBanner from "./PlanRiskBanner"
import PaycheckItemBreakdown from "./PaycheckItemBreakdown"

type NamedRow = { name: string; amount: number; due_date: number | null }

type Props = {
  result: SafeToSpendResult
  startingCash?: StartingCash
  classifiedBills?: ClassifiedItem<NamedRow>[]
  classifiedDebts?: ClassifiedItem<NamedRow>[]
  risk?: NearTermRisk | null
}

function sourceLabel(startingCash?: StartingCash): string {
  if (!startingCash) return "your last paycheck"
  if (startingCash.source === "linkedAccount") return `your "${startingCash.label}" imported balance`
  if (startingCash.source === "manualBalance") return "the balance you entered"
  return "your last paycheck"
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

/**
 * Paycheck-cycle Safe-to-Spend -- replaces the old flat "this calendar
 * month" SafeToSpend card. All the math lives in lib/safeToSpend.ts; this
 * is display only. Deliberately labels the starting figure as "your last
 * paycheck" rather than "your balance" -- this app has no live bank-balance
 * connection, so it doesn't get to claim it knows one.
 */
export default function PaycheckCountdown({ result, startingCash, classifiedBills = [], classifiedDebts = [], risk }: Props) {
  const formatMoney = useFormatCurrency()
  const upcomingItems = [...classifiedBills, ...classifiedDebts]
    .filter((i) => i.itemStatus === "upcoming")
    .map((i) => ({ name: i.name, amount: i.amount }))
  const alreadyDueItems = [...classifiedBills, ...classifiedDebts]
    .filter((i) => i.itemStatus === "alreadyDue")
    .map((i) => ({ name: i.name, amount: i.amount }))

  if (!result.hasIncome) {
    return (
      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-6 shadow-lg">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-emerald-400" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">Safe to spend</h2>
        </div>
        <p className="mt-2 text-gray-400">Add your income to see how much is safe to spend until your next paycheck.</p>
      </div>
    )
  }

  if (result.missingPayDate || !result.nextPaycheckDate) {
    return (
      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-6 shadow-lg">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-emerald-400" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">Safe to spend</h2>
        </div>
        <p className="mt-2 text-gray-400">
          Add a pay date to your income to see how much is safe to spend until your next paycheck.
        </p>
      </div>
    )
  }

  const positive = result.safeToSpend >= 0

  return (
    <div className="space-y-3">
      {risk && <PlanRiskBanner risk={risk} />}
      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-6 shadow-lg">
      <div className="flex items-center gap-2">
        <Wallet size={18} className="text-emerald-400" />
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">Safe to spend</h2>
        <InfoHint
          label="About Safe to Spend"
          text="Based on your starting cash, minus what's still due (bills, debt payments, goal contributions) before your next paycheck. Not a live bank balance unless you've linked or entered one yourself on Survival Mode."
        />
      </div>

      <p className={`mt-2 text-4xl font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
        {formatMoney(result.safeToSpend)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-400">
        <CalendarClock size={14} />
        Until {formatDate(result.nextPaycheckDate)}
        {result.daysUntilNextPaycheck != null && (
          <span className="text-gray-500">
            &nbsp;&middot; {result.daysUntilNextPaycheck === 0 ? "today" : `${result.daysUntilNextPaycheck} day${result.daysUntilNextPaycheck === 1 ? "" : "s"}`}
          </span>
        )}
      </p>

      <div className="mt-4 space-y-1.5 text-sm text-gray-400">
        <div className="flex justify-between">
          <span>Starting from {sourceLabel(startingCash)}</span>
          <span className="text-gray-200">{formatMoney(result.startingCash)}</span>
        </div>
        {result.billsDue > 0 && (
          <div className="flex justify-between">
            <span>Upcoming bills</span>
            <span className="text-gray-200">-{formatMoney(result.billsDue)}</span>
          </div>
        )}
        {result.debtsDue > 0 && (
          <div className="flex justify-between">
            <span>Debt payments</span>
            <span className="text-gray-200">-{formatMoney(result.debtsDue)}</span>
          </div>
        )}
        {result.goalContribution > 0 && (
          <div className="flex justify-between">
            <span>Goal contributions</span>
            <span className="text-gray-200">-{formatMoney(result.goalContribution)}</span>
          </div>
        )}
      </div>

      {(!startingCash || startingCash.source === "lastPaycheck") && (
        <p className="mt-2 text-xs text-gray-500">
          This is a projection, not your real balance.{" "}
          <Link href="/survival-mode" className="text-emerald-400 hover:underline">
            Add your real balance
          </Link>{" "}
          for more accuracy.
        </p>
      )}

      {result.dailyLimit != null && result.daysUntilNextPaycheck != null && result.daysUntilNextPaycheck > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="text-sm text-gray-300">Daily spending limit</span>
          <span className={`text-lg font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
            {formatMoney(result.dailyLimit)}/day
          </span>
        </div>
      )}

      {!positive && (
        <p className="mt-3 text-sm text-red-300">
          What's still due before your next paycheck is more than it covers. Consider trimming bills or revisiting your debt plan.
        </p>
      )}

      {(upcomingItems.length > 0 || alreadyDueItems.length > 0) && (
        <div className="mt-4 space-y-2">
          <PaycheckItemBreakdown
            title="What's counted above"
            hint="These are what's actually subtracted from Safe to Spend."
            items={upcomingItems}
          />
          <PaycheckItemBreakdown
            title="Already due earlier this cycle"
            hint="Due day already passed this month, so this is assumed already paid from your last paycheck -- not subtracted above. If it hasn't actually gone out yet, your real Safe to Spend is lower than shown."
            items={alreadyDueItems}
          />
        </div>
      )}
      </div>
    </div>
  )
}
