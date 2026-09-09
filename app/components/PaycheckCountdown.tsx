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
  // QA fix (Sep 4 2026, Vince): "the arithmetic is correct... but if those
  // earlier-cycle items are not already reflected in the current balance,
  // Safe to Spend is too high." Confirmed true for his own live BitDefender/
  // DiBeasi/Meijer trio -- $124.99 still genuinely unpaid, not yet reflected
  // in his entered balance.
  //
  // CRITICAL FIX (Sep 9 2026, Vince, reviewing a live screenshot): the Sep 4
  // decision above was to leave these excluded from Safe to Spend and only
  // warn about them on the theory that an unconfirmed item could just as
  // easily have already cleared. Revisited: paid_through is this app's real
  // source of truth for "was this paid" (set by "Mark as paid" in Bills &
  // Debts), and anything classified "alreadyDue" here has NOT been marked
  // paid -- so Safe to Spend now reserves it directly (lib/safeToSpend.ts
  // widens its own due-window to include it).
  //
  // SECOND FIX, same day (Vince caught this too, from the next screenshot):
  // once the money was correctly reserved, this file still showed it in a
  // SEPARATE breakdown list with its own separate total -- "What's counted
  // above" summed only the upcoming items, so it no longer matched Upcoming
  // bills + Debt payments, which both already included the already-due
  // amount. One list, one total, from here on: `allCommittedItems` combines
  // both, `pastDue` is a per-item flag rather than a second bucket, and
  // upcomingBillsAmount/upcomingDebtsAmount/pastDueTotal below split the
  // SAME already-reserved total for display, not a second deduction.
  const upcomingBillsAmount = classifiedBills.filter((b) => b.itemStatus === "upcoming").reduce((sum, b) => sum + b.amount, 0)
  const upcomingDebtsAmount = classifiedDebts.filter((d) => d.itemStatus === "upcoming").reduce((sum, d) => sum + d.amount, 0)
  const pastDueTotal = [...classifiedBills, ...classifiedDebts]
    .filter((i) => i.itemStatus === "alreadyDue")
    .reduce((sum, i) => sum + i.amount, 0)
  // CRITICAL FIX (Sep 9 2026, Vince, "option 1" -- "reduce Safe to Spend
  // itself" so 53rd earmarks the personal loan/mortgage): when
  // lib/safeToSpend.ts's floorSafeToSpend has pulled safeToSpend down to
  // protect a LATER paycheck cycle (result.reservedThroughDate), that gap
  // needs its own visible line here too -- otherwise this list's own total
  // would quietly stop matching the headline number above it, the exact
  // "$868.04 vs $926.03" black-box problem Vince already caught once. Not
  // yet attributed to the specific debt causing it (that would need the
  // classified items for a future cycle, not just this one) -- named
  // generically until that's wired up.
  const multiCycleReserve = result.reservedThroughDate
    ? Math.max(0, result.startingCash - (result.billsDue + result.debtsDue + result.goalContribution) - result.safeToSpend)
    : 0
  const allCommittedItems = [
    ...[...classifiedBills, ...classifiedDebts].map((i) => ({
      name: i.name,
      amount: i.amount,
      date: i.occurrenceDate,
      pastDue: i.itemStatus === "alreadyDue",
    })),
    ...(multiCycleReserve > 0 && result.reservedThroughDate
      ? [{ name: "Reserved for an upcoming paycheck cycle", amount: multiCycleReserve, date: result.reservedThroughDate, pastDue: false }]
      : []),
  ]
  const totalCommitted = result.billsDue + result.debtsDue + result.goalContribution + multiCycleReserve

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

      {pastDueTotal > 0 && (
        <p className="mt-2 rounded-lg bg-warning px-3 py-2 text-xs text-warning-heading">
          {formatMoney(pastDueTotal)} of this is already past due and unpaid -- it's included in Safe to Spend
          above once, not an extra deduction. Marked "Past due" in the list below.
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
        {upcomingBillsAmount > 0 && (
          <div className="flex justify-between">
            <span>Upcoming bills</span>
            <span className="text-secondary">-{formatMoney(upcomingBillsAmount)}</span>
          </div>
        )}
        {upcomingDebtsAmount > 0 && (
          <div className="flex justify-between">
            <span>Debt payments</span>
            <span className="text-secondary">-{formatMoney(upcomingDebtsAmount)}</span>
          </div>
        )}
        {pastDueTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-warning-heading">Past-due unpaid commitments</span>
            <span className="text-warning-heading">-{formatMoney(pastDueTotal)}</span>
          </div>
        )}
        {result.goalContribution > 0 && (
          <div className="flex justify-between">
            <span>Goal contributions</span>
            <span className="text-secondary">-{formatMoney(result.goalContribution)}</span>
          </div>
        )}
        {multiCycleReserve > 0 && result.reservedThroughDate && (
          <div className="flex justify-between">
            <span>Reserved for {formatDate(result.reservedThroughDate)}</span>
            <span className="text-secondary">-{formatMoney(multiCycleReserve)}</span>
          </div>
        )}
        {(upcomingBillsAmount > 0 || upcomingDebtsAmount > 0 || pastDueTotal > 0 || result.goalContribution > 0 || multiCycleReserve > 0) && (
          <div className="flex justify-between border-t border-default pt-1.5 font-[600] text-primary">
            <span>Total committed</span>
            <span>-{formatMoney(totalCommitted)}</span>
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

      {allCommittedItems.length > 0 && (
        <div className="mt-4">
          <PaycheckItemBreakdown
            title="What's committed"
            hint='All unpaid bills and debt payments are included in Safe to Spend once. Items marked "Past due" already passed their due date and still need to be paid -- they are not a second deduction.'
            items={allCommittedItems}
            defaultOpen
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
