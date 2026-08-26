"use client"

import InfoHint from "./InfoHint"
import { Wallet, CalendarClock } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { SafeToSpendResult } from "@/lib/safeToSpend"

type Props = {
  result: SafeToSpendResult
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
export default function PaycheckCountdown({ result }: Props) {
  const formatMoney = useFormatCurrency()

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
    <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-6 shadow-lg">
      <div className="flex items-center gap-2">
        <Wallet size={18} className="text-emerald-400" />
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">Safe to spend</h2>
        <InfoHint
          label="About Safe to Spend"
          text="Based on your last paycheck, minus what's still due (bills, debt payments, goal contributions) before your next one. Not a live bank balance -- Paycheck Planner doesn't have that connection."
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
          <span>Last paycheck</span>
          <span className="text-gray-200">{formatMoney(result.lastPaycheckAmount)}</span>
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
    </div>
  )
}
