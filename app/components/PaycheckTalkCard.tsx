"use client"

import { MessageCircle, ArrowRight } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { PaycheckTalkNarrative } from "@/lib/paycheckCapacity"

type Props = {
  narrative: PaycheckTalkNarrative
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })
}

const LEVEL_STYLE: Record<string, { dot: string; text: string }> = {
  very_tight: { dot: "bg-red-400", text: "text-red-400" },
  moderate: { dot: "bg-amber-400", text: "text-amber-400" },
  healthy: { dot: "bg-emerald-400", text: "text-emerald-400" },
}

const LEVEL_LABEL: Record<string, string> = {
  very_tight: "Very Tight",
  moderate: "Moderate",
  healthy: "Healthy",
}

/**
 * "If This Paycheck Could Talk" -- a narrative read of lib/paycheckCapacity.ts's
 * comparison between the soonest upcoming paycheck and the one after it.
 * Sits on the Dashboard, next to Safe-to-Spend/What-If, since those answer
 * "what can I spend today" and this answers a different question: "which of
 * my paychecks actually has room."
 */
export default function PaycheckTalkCard({ narrative }: Props) {
  const formatMoney = useFormatCurrency()
  const { thisCycle, nextCycle, headline, detail, recommendation } = narrative
  const style = LEVEL_STYLE[thisCycle.level]

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0b1220] p-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-500/15 border border-indigo-500/30">
          <MessageCircle size={20} className="text-indigo-400" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">If This Paycheck Could Talk</h2>
          <p className="text-sm text-gray-400">Your {formatDate(thisCycle.date)} paycheck, in plain English.</p>
        </div>
      </div>

      <div>
        <p className="text-white font-medium">{headline}</p>
        <p className="mt-1 text-sm text-gray-400">{detail}</p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
          <span className={`font-semibold ${style.text}`}>{LEVEL_LABEL[thisCycle.level]}</span>
          <span className="text-gray-500">
            &middot; {formatMoney(thisCycle.cushion)} of {formatMoney(thisCycle.amount)} left over
          </span>
        </div>
      </div>

      {nextCycle && (
        <div className="flex items-center gap-2 text-xs text-gray-500 border-t border-gray-800 pt-3">
          <span>{formatDate(thisCycle.date)}: {thisCycle.capacityPct}% capacity</span>
          <ArrowRight size={12} />
          <span>{formatDate(nextCycle.date)}: {nextCycle.capacityPct}% capacity</span>
        </div>
      )}

      {recommendation && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-300">Recommendation</h3>
          <p className="mt-1 text-sm text-white">
            {recommendation.kind === "defer_to_next" ? (
              <>
                Don&apos;t make additional debt payments from this paycheck. Your{" "}
                {formatDate(recommendation.targetDate)} paycheck has {formatMoney(recommendation.amountGap)} more
                available capacity.
              </>
            ) : (
              <>
                Your {formatDate(recommendation.targetDate)} paycheck will be tighter, with{" "}
                {formatMoney(recommendation.amountGap)} less room. If you&apos;re able, this is a good paycheck to
                get ahead on an extra payment instead.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
