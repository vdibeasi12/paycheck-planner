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

function shortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
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
  //
  // CRITICAL FIX (Sep 10 2026, Vince, live screenshot of 53rd Checking
  // reading -$21.84 on an account holding $3,353.13): "Right now you have
  // people doing the math and that's not what it's supposed to do, the app is
  // to do the math and show what is left over to pay down debt. I am not
  // negative on my accounts." The card showed "Until September 30 - 20 days"
  // and a $3,324.97 deduction, and never once showed the two $1,660 paychecks
  // landing inside those same 20 days -- so the only way to reconcile the
  // headline was to do the missing arithmetic yourself. lib/safeToSpend.ts
  // now projects a real balance timeline (see projectBalanceTimeline in
  // lib/paycheckCycles.ts) and the headline is its LOW POINT; this card shows
  // that timeline directly, money in and money out on the same calendar, with
  // a breakdown that reproduces the headline exactly.
  const timeline = result.timeline
  const pastDueTotal = timeline
    ? timeline.events.filter((e) => e.pastDue).reduce((sum, e) => sum + -e.delta, 0)
    : [...classifiedBills, ...classifiedDebts]
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
  // The full schedule behind the number: every bill and debt payment between
  // now and the end of the projection, in the order they actually hit the
  // account. Falls back to the classified lists for any caller that hasn't
  // been given a timeline yet.
  const allCommittedItems = timeline
    ? timeline.events
        .filter((e) => e.delta < 0)
        .map((e) => ({ name: e.name, amount: -e.delta, date: e.date, pastDue: e.pastDue }))
    : [...classifiedBills, ...classifiedDebts].map((i) => ({
        name: i.name,
        amount: i.amount,
        date: i.occurrenceDate,
        pastDue: i.itemStatus === "alreadyDue",
      }))
  const incomingCount = timeline ? timeline.events.filter((e) => e.kind === "income").length : 0

  if (!result.hasIncome) {
    return (
      <div className="rounded-2xl border border-default bg-gradient-to-br from-surface to-surface-alt p-6 shadow-lg">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-emerald-400" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Safe to spend</h2>
        </div>
        <p className="mt-2 text-muted">Add your income to see how much is safe to spend this month.</p>
      </div>
    )
  }

  if (result.missingPayDate || !result.windowEndDate) {
    return (
      <div className="rounded-2xl border border-default bg-gradient-to-br from-surface to-surface-alt p-6 shadow-lg">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-emerald-400" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Safe to spend</h2>
        </div>
        <p className="mt-2 text-muted">
          Add a pay date to your income to see how much is safe to spend this month.
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
          text="We put every paycheck, bill and debt payment on one calendar and follow your balance forward. This is the lowest it ever gets -- spend up to it and you still cover everything on time. Savings/goal contributions are never subtracted. Not a live bank balance unless you've linked or entered one yourself on Survival Mode."
        />
      </div>

      <p className={`mt-2 text-4xl font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
        {formatMoney(result.safeToSpend)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
        <CalendarClock size={14} />
        {result.lowestDate ? (
          <>Your tightest day is {formatDate(result.lowestDate)}</>
        ) : (
          <>Nothing ahead dips below what you have today</>
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
        {/*
          These three lines are the whole headline, and they add up to it
          exactly -- balance + what comes in through the tightest day - what
          goes out through the tightest day. lib/safeToSpend.ts computes
          incomeThroughLowest/outflowThroughLowest for precisely this reason,
          so the card can never again show a number its own breakdown can't
          reproduce.
        */}
        {timeline && result.lowestDate && (
          <>
            <div className="flex justify-between">
              <span>Money coming in by {shortDate(result.lowestDate)}</span>
              <span className="text-emerald-400">+{formatMoney(result.incomeThroughLowest)}</span>
            </div>
            <div className="flex justify-between">
              <span>Bills &amp; debt payments by {shortDate(result.lowestDate)}</span>
              <span className="text-secondary">-{formatMoney(result.outflowThroughLowest)}</span>
            </div>
            <div className="flex justify-between border-t border-default pt-1.5 font-[600] text-primary">
              <span>Left on your tightest day</span>
              <span className={positive ? "text-emerald-400" : "text-red-400"}>{formatMoney(result.safeToSpend)}</span>
            </div>
          </>
        )}
      </div>

      {timeline && incomingCount > 0 && (
        <p className="mt-3 text-sm text-secondary">
          After that day you have {incomingCount} more paycheck{incomingCount === 1 ? "" : "s"} coming in before{" "}
          {shortDate(timeline.toISO)}, and everything due in between is already counted below. Your balance
          ends that stretch around {formatMoney(timeline.endingBalance)}.
        </p>
      )}

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

      {result.dailyLimit != null && result.daysUntilWindowEnd != null && result.daysUntilWindowEnd > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="text-sm text-secondary">Daily spending limit</span>
          <span className={`text-lg font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
            {formatMoney(result.dailyLimit)}/day
          </span>
        </div>
      )}

      {!positive && (
        <p className="mt-3 text-sm text-red-300">
          This account runs {formatMoney(Math.abs(result.safeToSpend))} short on{" "}
          {result.lowestDate ? formatDate(result.lowestDate) : "its tightest day"} -- that's the gap to close, not the
          whole month. Moving that much in from another account, or pushing one payment past that date, clears it.
        </p>
      )}

      {allCommittedItems.length > 0 && (
        <div className="mt-4">
          <PaycheckItemBreakdown
            title={timeline ? `Everything due through ${shortDate(timeline.toISO)}` : "What's committed"}
            hint={
              timeline
                ? 'Every bill and debt payment on the calendar between now and then, each counted once, in the order it hits the account. Your paychecks are counted too -- they are why this total can be larger than Safe to Spend without anything being wrong. Items marked "Past due" already passed their due date and still need to be paid.'
                : 'All unpaid bills and debt payments are included in Safe to Spend once. Items marked "Past due" already passed their due date and still need to be paid -- they are not a second deduction.'
            }
            items={allCommittedItems}
            defaultOpen
          />
        </div>
      )}

      {/*
        Sep 10 2026, Vince: "the water bill was already paid on 9-2... I can't
        keep going back and forth telling you this was paid." Anything due on
        or before the date the entered balance was taken is already out of
        that balance, so the projection stops subtracting it a second time
        (see balanceAsOfISO in lib/paycheckCycles.ts). Listed here rather than
        dropped silently, so an item that genuinely DIDN'T get paid is still
        visible and can be corrected instead of quietly disappearing.
      */}
      {timeline && timeline.assumedSettled.length > 0 && startingCash?.asOf && (
        <div className="mt-2">
          <PaycheckItemBreakdown
            title={`Already covered by your ${shortDate(startingCash.asOf)} balance`}
            hint={`These came due on or before ${shortDate(startingCash.asOf)}, the date that balance was taken, so the money is already out of it. Counting them again would deduct them twice. If one of these actually hasn't been paid, update your balance or mark it unpaid.`}
            items={timeline.assumedSettled.map((a) => ({ name: a.name, amount: a.amount, date: a.date }))}
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
