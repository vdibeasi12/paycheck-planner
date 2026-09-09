"use client"

// app/components/ExtraDebtPaymentCard.tsx
// The "Extra Debt Payment" hero number from Vince's Sep 5/6 critique --
// previously only reachable via the interactive debt-selection tool on
// /bills-debts (app/components/DebtPayoffAffordability.tsx). This is the
// baseline read (no specific debts picked yet) surfaced prominently on the
// new /safe-to-spend page, per his explicitly-deferred "surface this more
// prominently" idea from the frozen calc-engine work -- same
// lib/debtPayoffSafety.ts math, not a new calculation.

import Link from "next/link"
import { PiggyBank, ArrowRight } from "lucide-react"
import InfoHint from "./InfoHint"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { DebtPayoffAffordability } from "@/lib/debtPayoffSafety"

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function ExtraDebtPaymentCard({ affordability }: { affordability: DebtPayoffAffordability }) {
  const formatMoney = useFormatCurrency()
  const positive = affordability.maxSafeToPayoff >= 0

  return (
    <div className="rounded-2xl border border-default bg-surface p-6 shadow-lg">
      <div className="flex items-center gap-2">
        <PiggyBank size={18} className="text-emerald-400" />
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Extra debt payment</h2>
        <InfoHint
          label="About Extra Debt Payment"
          text={`The most you can safely send to debt today without dipping below a ${formatMoney(
            affordability.reserve
          )} cushion across your upcoming paychecks. Same math as "Can I pay this off?" on Bills & Debts.`}
        />
      </div>

      <p className={`mt-2 text-4xl font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
        {formatMoney(Math.max(0, affordability.maxSafeToPayoff))}
      </p>
      <p className="mt-1 text-sm text-muted">
        {affordability.tightestDate
          ? `Keeps you covered through ${formatDate(affordability.tightestDate)}, your tightest upcoming cycle`
          : "Today's balance is the binding constraint, not a future paycheck"}
      </p>

      {/* CRITICAL FIX (Sep 9 2026, Vince, reviewing a live screenshot): the
          $150 reserve used to only appear inside a sentence (or a hover
          tooltip before that) -- "the $150 buffer isn't explained anywhere
          on this screen." Same authoritative numbers
          (computeDebtPayoffAffordability) as the headline above, just shown
          as explicit line items instead of requiring mental math. */}
      <div className="mt-3 space-y-1.5 border-t border-default pt-3 text-sm text-muted">
        <div className="flex justify-between">
          <span>{affordability.tightestDate ? `Available on ${formatDate(affordability.tightestDate)}` : "Available today"}</span>
          <span className="text-secondary">{formatMoney(affordability.tightestRunningBalance)}</span>
        </div>
        <div className="flex justify-between">
          <span>Protected cash reserve</span>
          <span className="text-secondary">-{formatMoney(affordability.reserve)}</span>
        </div>
        <div className="flex justify-between border-t border-default pt-1.5 font-[600] text-primary">
          <span>Extra debt payment</span>
          <span>{formatMoney(affordability.maxSafeToPayoff)}</span>
        </div>
      </div>

      {!positive && (
        <p className="mt-3 text-sm text-red-300">
          Your plan is already tighter than the {formatMoney(affordability.reserve)} cushion this assumes --
          sending anything extra to debt right now isn't safe yet.
        </p>
      )}

      <Link
        href="/bills-debts"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:underline"
      >
        Pick specific debts to pay off <ArrowRight size={14} />
      </Link>
    </div>
  )
}
