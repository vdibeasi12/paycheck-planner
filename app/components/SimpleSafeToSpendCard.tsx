"use client"

// app/components/SimpleSafeToSpendCard.tsx
//
// Sep 11 2026, Vince: "I don't like the way this is laid out. It's way too
// complicated and most people won't want this much detail... Most people just
// want an overview of what they can spend to pay another credit card or just
// buy something without overdrawing their account."
//
// This is the whole Simple view. It answers exactly the two questions he
// named -- can I buy this, and can I put something toward a card -- and shows
// nothing else. No timeline, no breakdown, no daily limit, no committed list,
// no monthly capacity. Those all still exist and are all still correct; they
// live in Detailed, one click away (see SafeToSpendModeSwitch).
//
// Deliberately reads the SAME already-computed numbers the detailed view
// uses. There is no second calculation here and there must never be one --
// the whole failure mode this app keeps hitting is two places computing
// almost-the-same figure and quietly disagreeing.

import { Wallet, CreditCard } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { SafeToSpendResult } from "@/lib/safeToSpend"
import type { DebtPayoffAffordability } from "@/lib/debtPayoffSafety"

function longDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })
}

export default function SimpleSafeToSpendCard({
  accountName,
  result,
  affordability,
}: {
  accountName?: string
  result: SafeToSpendResult
  affordability?: DebtPayoffAffordability
}) {
  const formatMoney = useFormatCurrency()

  if (!result.hasIncome || result.missingPayDate) {
    return (
      <div className="rounded-2xl border border-default bg-surface p-6 shadow-lg">
        {accountName && <p className="text-sm font-medium text-muted">{accountName}</p>}
        <p className="mt-2 text-muted">Add your income and a pay date to see what&apos;s safe to spend.</p>
      </div>
    )
  }

  const safe = result.safeToSpend
  const positive = safe > 0
  const toDebt = affordability ? affordability.maxSafeToPayoff : 0

  return (
    <div className="rounded-2xl border border-default bg-gradient-to-br from-surface to-surface-alt p-6 shadow-lg">
      {accountName && <p className="text-sm font-medium text-muted">{accountName}</p>}

      <div className="mt-1 flex items-center gap-2">
        <Wallet size={18} className="text-emerald-400" />
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Safe to spend</h2>
      </div>

      <p className={`mt-2 text-5xl font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
        {formatMoney(Math.max(0, safe))}
      </p>

      {/* One sentence. The detailed view is where the reasoning lives. */}
      {positive ? (
        <p className="mt-2 text-base text-secondary">
          Spend up to this and every bill and payment still clears on time
          {result.lowestDate ? <> -- your tightest day is {longDate(result.lowestDate)}</> : null}.
        </p>
      ) : (
        <p className="mt-2 text-base text-red-300">
          Nothing is free to spend right now. This account comes up{" "}
          <span className="font-semibold">{formatMoney(Math.abs(safe))}</span> short
          {result.lowestDate ? <> on {longDate(result.lowestDate)}</> : null} -- that&apos;s the gap to close, not
          the whole month.
        </p>
      )}

      {/* Vince named paying down a card as the other thing people come here
          for, so it's the one extra number Simple earns. Hidden when there
          isn't any, rather than shown as a zero or a negative, which reads as
          a problem to solve instead of an option that isn't available. */}
      {affordability && toDebt > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-secondary">
            <CreditCard size={16} className="text-emerald-400" />
            Safe to put toward a card today
          </span>
          <span className="text-lg font-bold text-emerald-400">{formatMoney(toDebt)}</span>
        </div>
      )}
    </div>
  )
}
