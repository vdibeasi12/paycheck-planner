"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"

function formatShortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/**
 * Itemized list -- shared by the Dashboard's Paycheck Countdown card and
 * Survival Mode so a bill/debt total never has to be taken on faith.
 *
 * QA fix (Sep 4 2026, Vince): "that's how I need safe to spend to look so
 * people understand it" -- two things were missing that made this feel like
 * a black box even with the list expanded: (1) items showed a name and a
 * dollar amount but never the actual due date, so there was no way to tell
 * WHEN something was coming out without clicking into Bills & Debts; (2)
 * this defaulted to collapsed, so the one list that actually explains the
 * big number above it required an extra click to even see. `date` is now
 * shown next to each item when passed, and `defaultOpen` lets a caller
 * start the primary list expanded while secondary lists (covered-by-
 * transfer) stay collapsed.
 *
 * CRITICAL FIX (Sep 9 2026, Vince, reviewing a live screenshot): this used
 * to also be handed two SEPARATE lists for one card -- "what's counted"
 * (upcoming only) and "already due earlier this cycle" -- each with its own
 * total, neither of which matched what the headline number above actually
 * subtracted (his exact catch: "What's counted above" showed $868.04 while
 * Upcoming bills + Debt payments summed to $926.03, a $57.99 gap that was
 * really the already-due amount living in a different list). Callers now
 * pass ONE combined list with `pastDue` as a per-item flag instead, so
 * there is exactly one total, and it always equals what's actually
 * subtracted.
 */
export default function PaycheckItemBreakdown({
  title,
  hint,
  items,
  defaultOpen = false,
}: {
  title: string
  hint: string
  // CRITICAL FIX (Sep 9 2026, Vince, reviewing a live screenshot): `pastDue`
  // is a per-item FLAG, not a second amount -- a past-due item still counts
  // toward this list's own total exactly once, the same as any other item.
  // Introduced so "already due" items can live in the SAME list (and the
  // same total) as everything else Safe to Spend subtracts, instead of a
  // separate breakdown with its own separate total that didn't reconcile
  // with the headline number (the exact "$868.04 vs $926.03" confusion he
  // caught).
  items: { name: string; amount: number; date?: string; pastDue?: boolean }[]
  defaultOpen?: boolean
}) {
  const formatMoney = useFormatCurrency()
  const [open, setOpen] = useState(defaultOpen)
  if (items.length === 0) return null
  const total = items.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-sm font-semibold text-secondary">
          {title} <span className="font-normal text-muted">({items.length})</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-secondary">{formatMoney(total)}</span>
          <ChevronDown size={14} className={`text-muted transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="border-t border-white/10 px-4 py-3">
          <p className="mb-2 text-xs text-muted">{hint}</p>
          <div className="space-y-1.5">
            {items.map((i, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-secondary">
                  {i.name}
                  {i.date && <span className="ml-1.5 text-xs text-muted">({formatShortDate(i.date)})</span>}
                  {i.pastDue && (
                    <span className="ml-1.5 rounded bg-warning px-1.5 py-0.5 text-[10px] font-[600] uppercase tracking-wide text-warning-heading">
                      Past due
                    </span>
                  )}
                </span>
                <span className="text-muted">{formatMoney(i.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
