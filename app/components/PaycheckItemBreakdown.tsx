"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"

function formatShortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/**
 * Itemized list -- shared by the Dashboard's Paycheck Countdown card and
 * Survival Mode so a bill/debt total never has to be taken on faith. Used
 * both for "what's actually subtracted" and "what's assumed already paid"
 * lists.
 *
 * QA fix (Sep 4 2026, Vince): "that's how I need safe to spend to look so
 * people understand it" -- two things were missing that made this feel like
 * a black box even with the list expanded: (1) items showed a name and a
 * dollar amount but never the actual due date, so there was no way to tell
 * WHEN something was coming out without clicking into Bills & Debts; (2)
 * this defaulted to collapsed, so the one list that actually explains the
 * big number above it required an extra click to even see. `date` is now
 * shown next to each item when passed, and `defaultOpen` lets a caller
 * start the primary "what's counted" list expanded while secondary lists
 * (already-due, covered-by-transfer) stay collapsed.
 */
export default function PaycheckItemBreakdown({
  title,
  hint,
  items,
  defaultOpen = false,
}: {
  title: string
  hint: string
  items: { name: string; amount: number; date?: string }[]
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
        <span className="text-sm font-semibold text-gray-200">
          {title} <span className="font-normal text-gray-500">({items.length})</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-300">{formatMoney(total)}</span>
          <ChevronDown size={14} className={`text-gray-500 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="border-t border-white/10 px-4 py-3">
          <p className="mb-2 text-xs text-gray-500">{hint}</p>
          <div className="space-y-1.5">
            {items.map((i, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-300">
                  {i.name}
                  {i.date && <span className="ml-1.5 text-xs text-gray-500">({formatShortDate(i.date)})</span>}
                </span>
                <span className="text-gray-400">{formatMoney(i.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
