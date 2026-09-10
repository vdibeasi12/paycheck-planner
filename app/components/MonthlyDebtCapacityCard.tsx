"use client"

// app/components/MonthlyDebtCapacityCard.tsx
//
// Sep 10 2026, Vince: "create a section in safe to spend to show what you can
// safely pay extra towards debt per month basis."
//
// Sits next to ExtraDebtPaymentCard on purpose, and the whole job of this
// component is to make sure the two are never confused for each other. They
// answer different questions and, on Vince's own 53rd Checking, they differ by
// almost ten times:
//
//   Extra debt payment      $2,606.63   one time, out of what's sitting there
//   Extra toward debt/month   $271.69   every month, out of what comes in
//
// Sending $2,606.63 once is genuinely safe. Sending it every month would empty
// the account by November. So this card leads with the recurring number, names
// which ceiling is holding it back, and shows the income-minus-obligations
// arithmetic that produced it -- no mental math required to check it, which is
// the standard Vince has (rightly) held this app to all along.

import { CalendarSync } from "lucide-react"
import InfoHint from "./InfoHint"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { MonthlyDebtCapacity } from "@/lib/monthlyDebtCapacity"

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatMonth(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long" })
}

export default function MonthlyDebtCapacityCard({ capacity }: { capacity: MonthlyDebtCapacity }) {
  const formatMoney = useFormatCurrency()
  const has = capacity.monthlyExtra > 0

  return (
    <div className="rounded-2xl border border-default bg-surface p-6 shadow-lg">
      <div className="flex items-center gap-2">
        <CalendarSync size={18} className="text-emerald-400" />
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Extra toward debt, monthly</h2>
        <InfoHint
          label="About monthly extra debt payments"
          text={`The most you can send to debt EVERY month and keep doing it -- limited by what this account actually clears each month, not by what's in it today. Held to a ${formatMoney(
            capacity.reserve
          )} cushion at every point over the next year. Different from "Extra debt payment," which is a one-time amount out of your current balance.`}
        />
      </div>

      <p className={`mt-2 text-4xl font-bold ${has ? "text-emerald-400" : "text-red-400"}`}>
        {formatMoney(capacity.monthlyExtra)}
        <span className="text-lg font-semibold text-muted">/month</span>
      </p>
      <p className="mt-1 text-sm text-muted">
        {has && capacity.firstPaymentDate
          ? `Starting ${formatMonth(capacity.firstPaymentDate)}, on top of the minimums already counted`
          : "Nothing is sustainable as a recurring payment yet"}
      </p>

      {/* The arithmetic behind the headline, so it can be checked on sight.
          These three lines are exactly the "This Month" card's own figures --
          computeMonthlyDebtCapacity reads them from computeMonthlySafeToSpend
          rather than deriving its own, so the two cards cannot disagree. */}
      <div className="mt-3 space-y-1.5 border-t border-default pt-3 text-sm text-muted">
        <div className="flex justify-between">
          <span>Income, per month</span>
          <span className="text-secondary">{formatMoney(capacity.monthlyIncome)}</span>
        </div>
        <div className="flex justify-between">
          <span>Bills &amp; minimum payments</span>
          <span className="text-secondary">-{formatMoney(capacity.monthlyObligations)}</span>
        </div>
        <div className="flex justify-between border-t border-default pt-1.5 font-[600] text-primary">
          <span>Clears every month</span>
          <span className={capacity.structuralSurplus >= 0 ? "text-emerald-400" : "text-red-400"}>
            {formatMoney(capacity.structuralSurplus)}
          </span>
        </div>
      </div>

      {/* Why the headline isn't simply the surplus above. Naming the binding
          ceiling is the difference between a number you can act on and one you
          have to take on faith. */}
      {has && capacity.bindingConstraint === "cushion" && capacity.bindingDate && (
        <p className="mt-3 text-sm text-secondary">
          Capped below what you clear each month: paying more would take this account under its{" "}
          {formatMoney(capacity.reserve)} cushion around {formatDate(capacity.bindingDate)}. It rises as your
          balance rebuilds.
        </p>
      )}
      {has && capacity.bindingConstraint === "surplus" && (
        <p className="mt-3 text-sm text-secondary">
          This is everything this account clears each month. Anything beyond it would come out of your balance
          rather than your income, so it couldn&apos;t continue month after month.
        </p>
      )}
      {!has && capacity.structuralSurplus <= 0 && (
        <p className="mt-3 text-sm text-red-300">
          This account&apos;s bills and minimums already use everything it takes in each month, so there&apos;s
          nothing recurring to add on top yet. A one-time payment may still be safe -- see Extra debt payment.
        </p>
      )}
      {!has && capacity.structuralSurplus > 0 && (
        <p className="mt-3 text-sm text-red-300">
          This account clears {formatMoney(capacity.structuralSurplus)} a month, but its balance is too thin right
          now to commit any of it. Rebuild past the {formatMoney(capacity.reserve)} cushion first.
        </p>
      )}

      {/* A structurally healthy account can still be in trouble this week.
          Saying so here stops the card from reading as "you have money" next
          to a Safe to Spend number that says otherwise. */}
      {has && capacity.alreadyBelowReserve && (
        <p className="mt-3 rounded-lg bg-warning px-3 py-2 text-xs text-warning-heading">
          Worth knowing first: this account is projected to dip to{" "}
          {formatMoney(capacity.lowestBeforeAnyPayment)} before this payment would start, which is under the{" "}
          {formatMoney(capacity.reserve)} cushion. The monthly figure above accounts for that, but the near-term
          squeeze is real.
        </p>
      )}
    </div>
  )
}
