"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { NearTermRisk } from "@/lib/planResilience"

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/**
 * Cross-links Paycheck Shield's own forward-looking projection into
 * whichever page is showing "safe to spend right now" -- Safe to Spend and
 * Survival Mode only ever look at the very next paycheck, so a bill (a
 * mortgage, say) landing two paychecks out can leave both looking calm
 * while Paycheck Shield already knows that later cycle is in trouble. This
 * is that warning, shown right next to the number that would otherwise
 * look fine on its own.
 */
export default function PlanRiskBanner({ risk }: { risk: NearTermRisk }) {
  const formatMoney = useFormatCurrency()
  const breaks = risk.level === "breaks"

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        breaks ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <p>
          {breaks ? (
            <>
              Heads up -- your <strong>{formatDate(risk.cycle.date)}</strong> paycheck is projected to fall{" "}
              <strong>{formatMoney(Math.abs(risk.cycle.cushion))} short</strong> once that cycle's bills and debts
              come out, assuming nothing's held back from an earlier paycheck.
            </>
          ) : (
            <>
              Your <strong>{formatDate(risk.cycle.date)}</strong> paycheck is projected to leave only{" "}
              <strong>{formatMoney(risk.cycle.cushion)}</strong> of room once everything due that cycle comes out.
            </>
          )}{" "}
          <Link href="/paycheck-shield" className="font-semibold underline underline-offset-2">
            See Paycheck Shield
          </Link>{" "}
          for the full breakdown.
        </p>
      </div>
    </div>
  )
}
