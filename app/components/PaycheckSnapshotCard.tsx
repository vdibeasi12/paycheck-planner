"use client"

// app/components/PaycheckSnapshotCard.tsx
//
// The dashboard's first screen. Sep 12 2026, Vince, pointing at the phone
// mockup on the marketing homepage: "it looks really sleek, can the actual app
// look like this?"
//
// What made that mockup sleek was not its styling. It showed SIX things and
// they formed a sentence -- money in, where it goes, what is left, how you are
// doing. The dashboard showed about twenty independent widgets, opening with
// four unrelated KPIs (Net Worth, Total Debt, Monthly Payments, Debt Progress)
// that read like a spreadsheet header. This card is the sentence.
//
// Every figure comes from lib/paycheckSnapshot.ts, which reads the engine's
// already-computed result and is pinned by lib/__tests__/paycheckSnapshot.test.ts
// to the identity `onHand + incoming - out === safeToSpend`. Nothing is
// calculated here. If the breakdown ever fails to reconcile, `reconciles` is
// false and the middle section collapses to a single total rather than showing
// parts that do not add up to the number under them.
//
// Deliberately NOT here: the daily limit, the committed-items list, the
// timeline, the what-if slider, the risk banner, the charts. All still exist,
// all still correct, all one scroll or one click away. The calm in that mockup
// came from what it left out.

import Link from "next/link"
import { ArrowRight, Receipt, CreditCard, ArrowLeftRight, Wallet, TrendingUp } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { PaycheckSnapshot } from "@/lib/paycheckSnapshot"

function longDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })
}

function Row({
  icon,
  label,
  value,
  tone = "out",
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: "out" | "in"
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-2.5">
      <span className="flex min-w-0 items-center gap-2.5 text-sm text-secondary">
        <span className="shrink-0 text-muted">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className={`shrink-0 text-sm font-semibold tabular-nums ${tone === "in" ? "text-emerald-400" : "text-primary"}`}>
        {value}
      </span>
    </div>
  )
}

export default function PaycheckSnapshotCard({
  snapshot,
  percentPaid,
  totalDebt,
}: {
  snapshot: PaycheckSnapshot
  percentPaid: number
  totalDebt: number
}) {
  const formatMoney = useFormatCurrency()
  const safe = snapshot.safeToSpend
  const positive = safe > 0
  const pct = Math.max(0, Math.min(100, percentPaid))

  return (
    <div className="overflow-hidden rounded-2xl border border-default bg-surface shadow-lg">
      {/* On hand -- where the sentence starts. The as-of date is load-bearing
          copy, not a footnote: these balances are typed in by hand, and the
          app must never imply it is reading a live bank feed. */}
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {snapshot.onHandSource === "checking" ? "In checking" : "Your next paycheck"}
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-primary sm:text-4xl">
          {formatMoney(snapshot.onHand)}
        </p>
        {snapshot.onHandSource === "checking" && snapshot.onHandAsOf && (
          <p className="mt-1 text-xs text-muted">as of {longDate(snapshot.onHandAsOf)}</p>
        )}
      </div>

      {/* Where it goes. */}
      <div className="mt-4 border-t border-subtle/60 px-5 py-1 sm:px-6">
        {snapshot.incoming > 0 && (
          <Row
            icon={<TrendingUp size={16} className="text-emerald-400" />}
            label="Pay arriving before then"
            value={`+ ${formatMoney(snapshot.incoming)}`}
            tone="in"
          />
        )}

        {snapshot.reconciles ? (
          <>
            {snapshot.billsOut > 0 && (
              <Row icon={<Receipt size={16} />} label="Bills" value={`- ${formatMoney(snapshot.billsOut)}`} />
            )}
            {snapshot.debtsOut > 0 && (
              <Row icon={<CreditCard size={16} />} label="Debt payments" value={`- ${formatMoney(snapshot.debtsOut)}`} />
            )}
            {snapshot.transfersOut > 0 && (
              <Row
                icon={<ArrowLeftRight size={16} />}
                label="Automatic transfers"
                value={`- ${formatMoney(snapshot.transfersOut)}`}
              />
            )}
            {snapshot.totalOut === 0 && (
              <Row icon={<Receipt size={16} />} label="Nothing due before then" value={formatMoney(0)} />
            )}
          </>
        ) : (
          // The breakdown did not reconcile (see lib/paycheckSnapshot.ts). Show
          // the total, which is the engine's own figure and still correct,
          // rather than parts that would not sum to the headline below.
          <Row
            icon={<Receipt size={16} />}
            label="Bills and payments due"
            value={`- ${formatMoney(snapshot.totalOut)}`}
          />
        )}
      </div>

      {/* What is left. */}
      <div className="border-t border-subtle/60 bg-surface-alt/50 px-5 py-5 sm:px-6">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
          <Wallet size={14} className="text-emerald-400" /> Safe to spend
        </p>
        <p className={`mt-1 text-4xl font-bold tabular-nums sm:text-5xl ${positive ? "text-emerald-400" : "text-red-400"}`}>
          {formatMoney(positive ? safe : Math.abs(safe))}
        </p>
        {positive ? (
          <p className="mt-1.5 text-sm text-secondary">
            Spend up to this and everything still clears
            {snapshot.lowestDate ? <> -- your tightest day is {longDate(snapshot.lowestDate)}</> : null}.
          </p>
        ) : (
          <p className="mt-1.5 text-sm text-red-300">
            Short by this much
            {snapshot.lowestDate ? <> on {longDate(snapshot.lowestDate)}</> : null}. That is the gap to close, not the
            whole month.
          </p>
        )}
      </div>

      {/* How you are doing. The one number here that is not about this pay
          cycle -- it is the reason for the other three, and it is what the
          mockup closed on. Hidden entirely when there is no debt, where a
          "100% paid off" bar for someone who never had any would be noise. */}
      {totalDebt > 0 && (
        <div className="border-t border-subtle/60 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">Debt free progress</span>
            <span className="text-sm font-bold tabular-nums text-primary">{pct.toFixed(0)}%</span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Debt free progress"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <div className="border-t border-subtle/60 px-5 py-3 sm:px-6">
        <Link
          href="/safe-to-spend"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:underline"
        >
          See the full breakdown <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
