"use client"

import Link from "next/link"
import InfoHint from "./InfoHint"
import { Wallet, CalendarClock } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { SafeToSpendResult } from "@/lib/safeToSpend"
import type { ClassifiedItem } from "@/lib/paycheckCycles"
import type { NearTermRisk, UpcomingCycleForecast } from "@/lib/planResilience"
import type { StartingCash } from "@/lib/cashBalance"
import PlanRiskBanner from "./PlanRiskBanner"
import PaycheckItemBreakdown from "./PaycheckItemBreakdown"
import PaycheckLookahead from "./PaycheckLookahead"

type NamedRow = { name: string; amount: number; due_date: number | null }

type Props = {
  result: SafeToSpendResult
  startingCash?: StartingCash
  classifiedBills?: ClassifiedItem<NamedRow>[]
  classifiedDebts?: ClassifiedItem<NamedRow>[]
  coveredDebts?: { name: string; amount: number }[]
  risk?: NearTermRisk | null
  lookahead?: UpcomingCycleForecast[]
}

function sourceLabel(startingCash?: StartingCash): string {
  if (!startingCash || startingCash.source === "lastPaycheck") return "your last paycheck"
  return "your checking balance"
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
export default function PaycheckCountdown({
  result,
  startingCash,
  classifiedBills = [],
  classifiedDebts = [],
  coveredDebts = [],
  risk,
  lookahead = [],
}: Props) {
  const formatMoney = useFormatCurrency()
  const upcomingItems = [...classifiedBills, ...classifiedDebts]
    .filter((i) => i.itemStatus === "upcoming")
    .map((i) => ({ name: i.name, amount: i.amount, date: i.occurrenceDate }))
  const alreadyDueItems = [...classifiedBills, ...classifiedDebts]
    .filter((i) => i.itemStatus === "alreadyDue")
    .map((i) => ({ name: i.name, amount: i.amount, date: i.occurrenceDate }))
  // QA fix (Sep 4 2026, Vince): "the arithmetic is correct... but if those
  // earlier-cycle items are not already reflected in the current balance,
  // Safe to Spend is too high." Confirmed true for his own live BitDefender/
  // DiBeasi/Meijer trio -- $124.99 still genuinely unpaid, not yet reflected
  // in his entered balance.
  //
  // CRITICAL FIX (Sep 9 2026, Vince, reviewing a live screenshot): the Sep 4
  // decision above was to leave these excluded from Safe to Spend and only
  // warn about them ("isn't reserved above... your real Safe to Spend is
  // lower than shown") on the theory that an unconfirmed item could just as
  // easily have already cleared. Revisited: paid_through is this app's real
  // source of truth for "was this paid" (set by "Mark as paid" in Bills &
  // Debts), and anything reaching this list has NOT been marked paid -- so
  // that theory doesn't hold, and the warning was describing a real
  // understatement rather than a hypothetical one. Safe to Spend now
  // reserves this directly (lib/safeToSpend.ts widens its own due-window to
  // include it), so this total is informational: it's already included in
  // the number above, not a separate risk sitting outside it.
  const alreadyDueTotal = alreadyDueItems.reduce((sum, i) => sum + i.amount, 0)

  if (!result.hasIncome) {
    return (
      <div className="rounded-2xl border border-default bg-gradient-to-br from-surface to-surface-alt p-6 shadow-lg">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-emerald-400" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Safe to spend</h2>
        </div>
        <p className="mt-2 text-muted">Add your income to see how much is safe to spend until your next paycheck.</p>
      </div>
    )
  }

  if (result.missingPayDate || !result.nextPaycheckDate) {
    return (
      <div className="rounded-2xl border border-default bg-gradient-to-br from-surface to-surface-alt p-6 shadow-lg">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-emerald-400" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Safe to spend</h2>
        </div>
        <p className="mt-2 text-muted">
          Add a pay date to your income to see how much is safe to spend until your next paycheck.
        </p>
      </div>
    )
  }

  const positive = result.safeToSpend >= 0

  return (
    <div className="space-y-3">
      {risk && <PlanRiskBanner risk={risk} />}
      <div className="rounded-2xl border border-default bg-gradient-to-br from-surface to-surface-alt p-6 shadow-lg">
      <div className="flex items-center gap-2">
        <Wallet size={18} className="text-emerald-400" />
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Safe to spend</h2>
        <InfoHint
          label="About Safe to Spend"
          text="Based on your starting cash, minus what's still due (bills, debt payments, goal contributions) before your next paycheck. Not a live bank balance unless you've linked or entered one yourself on Survival Mode."
        />
      </div>

      <p className={`mt-2 text-4xl font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
        {formatMoney(result.safeToSpend)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
        <CalendarClock size={14} />
        Until {formatDate(result.nextPaycheckDate)}
        {result.daysUntilNextPaycheck != null && (
          <span className="text-muted">
            &nbsp;&middot; {result.daysUntilNextPaycheck === 0 ? "today" : `${result.daysUntilNextPaycheck} day${result.daysUntilNextPaycheck === 1 ? "" : "s"}`}
          </span>
        )}
      </p>

      {alreadyDueTotal > 0 && (
        <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {formatMoney(alreadyDueTotal)} of what's reserved above is bills or debt payments already past their due
          date that haven't been marked paid yet. See "Already due earlier this cycle" below.
        </p>
      )}

      <div className="mt-4 space-y-1.5 text-sm text-muted">
        {startingCash && startingCash.source === "checking" ? (
          <div className="flex justify-between">
            <span>Starting from {sourceLabel(startingCash)}</span>
            <span className="text-secondary">{formatMoney(result.startingCash)}</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between">
              <span>Your last paycheck</span>
              <span className="text-secondary">{formatMoney(result.lastPaycheckAmount)}</span>
            </div>
            {result.transfersOut > 0 && (
              <div className="flex justify-between">
                <span>Automatic transfer out</span>
                <span className="text-secondary">-{formatMoney(result.transfersOut)}</span>
              </div>
            )}
          </>
        )}
        {result.billsDue > 0 && (
          <div className="flex justify-between">
            <span>Upcoming bills</span>
            <span className="text-secondary">-{formatMoney(result.billsDue)}</span>
          </div>
        )}
        {result.debtsDue > 0 && (
          <div className="flex justify-between">
            <span>Debt payments</span>
            <span className="text-secondary">-{formatMoney(result.debtsDue)}</span>
          </div>
        )}
        {result.goalContribution > 0 && (
          <div className="flex justify-between">
            <span>Goal contributions</span>
            <span className="text-secondary">-{formatMoney(result.goalContribution)}</span>
          </div>
        )}
      </div>

      {(!startingCash || startingCash.source === "lastPaycheck") && (
        <p className="mt-2 text-xs text-muted">
          This is a projection, not your real balance.{" "}
          <Link href="/survival-mode" className="text-emerald-400 hover:underline">
            Add your real balance
          </Link>{" "}
          for more accuracy.
        </p>
      )}

      {startingCash?.source === "checking" && (
        <p className="mt-2 text-xs text-muted">
          Not linked to your bank -- calculated from the balance you entered on{" "}
          {startingCash.asOf ? new Date(startingCash.asOf + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "file"}
          , projected forward with your income/bills/debts.
        </p>
      )}

      {result.dailyLimit != null && result.daysUntilNextPaycheck != null && result.daysUntilNextPaycheck > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="text-sm text-secondary">Daily spending limit</span>
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
            hint="These, plus anything already due below, are what's actually subtracted from Safe to Spend."
            items={upcomingItems}
            defaultOpen
          />
          <PaycheckItemBreakdown
            title="Already due earlier this cycle"
            hint="Due day already passed this month and not yet marked paid, so it's included in what's subtracted above, not on top of it. Once you mark it paid, it'll drop off here."
            items={alreadyDueItems}
          />
        </div>
      )}

      {coveredDebts.length > 0 && (
        <div className="mt-2">
          <PaycheckItemBreakdown
            title="Covered by an automatic transfer"
            hint="Paid from a linked account this paycheck automatically sweeps money to -- not part of what's subtracted above, so it's not double-counted."
            items={coveredDebts}
          />
        </div>
      )}

      <PaycheckLookahead forecast={lookahead} />
      </div>
    </div>
  )
}
