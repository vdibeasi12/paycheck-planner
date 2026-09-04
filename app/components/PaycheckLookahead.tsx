"use client"

import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { UpcomingCycleForecast } from "@/lib/planResilience"

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })
}

function formatShortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const VERDICT_LABEL: Record<UpcomingCycleForecast["verdict"], string> = {
  survives: "Covered",
  tight: "Tight",
  breaks: "Comes up short",
}

const VERDICT_CLASS: Record<UpcomingCycleForecast["verdict"], string> = {
  survives: "text-emerald-400",
  tight: "text-amber-400",
  breaks: "text-red-400",
}

/**
 * "Then what" -- Sep 4 2026, Vince: "if I have this much then how will I be
 * able to pay my mortgage Oct 1, car payment Sept 15, and personal loan
 * sept 22nd." Safe to Spend only ever answers for the very next paycheck by
 * design; this is what answers the rest of it without making anyone do the
 * cycle-by-cycle math by hand -- for each of the next couple of real
 * paychecks, exactly which bills/debts land before it and whether the real
 * running balance still covers them once it does. Built on the same
 * projection as Paycheck Shield (lib/planResilience.ts's
 * buildUpcomingForecast), so this never disagrees with that page.
 */
export default function PaycheckLookahead({ forecast }: { forecast: UpcomingCycleForecast[] }) {
  const formatMoney = useFormatCurrency()
  if (forecast.length === 0) return null

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Then what</p>
      <p className="text-xs text-gray-500">Picks up right after the paycheck above -- not a gap, just not repeating it.</p>
      {forecast.map((f, idx) => (
        <div key={f.date} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-200">
              {/* QA fix (Sep 4 2026, Vince): the very first entry picks up
                  right where the Safe to Spend card above left off -- show
                  that start date too (not just the end), so it's visible
                  that nothing was skipped, only the cycle already shown
                  above. Later entries already read fine as "date paycheck"
                  since each one's start is the previous entry, right above
                  it in this same list. */}
              {idx === 0 ? `${formatShortDate(f.windowStart)} → ${formatDate(f.date)}` : `${formatDate(f.date)} paycheck`}
            </span>
            <span className={`text-xs font-semibold ${VERDICT_CLASS[f.verdict]}`}>{VERDICT_LABEL[f.verdict]}</span>
          </div>
          {f.items.length > 0 && (
            <div className="mt-2 space-y-1">
              {f.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs text-gray-400">
                  <span>
                    {item.name} <span className="text-gray-500">({formatShortDate(item.occurrenceDate)})</span>
                  </span>
                  <span>{formatMoney(item.amount)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-xs text-gray-500">
            <span>Projected balance after</span>
            <span className={f.runningBalance >= 0 ? "text-gray-300" : "text-red-400"}>
              {formatMoney(f.runningBalance)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
