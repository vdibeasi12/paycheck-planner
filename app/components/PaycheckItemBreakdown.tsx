"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"

/**
 * Collapsible itemized list -- shared by the Dashboard's Paycheck Countdown
 * card and Survival Mode so a bill/debt total never has to be taken on
 * faith. Used both for "what's actually subtracted" and "what's assumed
 * already paid" lists.
 */
export default function PaycheckItemBreakdown({
  title,
  hint,
  items,
}: {
  title: string
  hint: string
  items: { name: string; amount: number }[]
}) {
  const formatMoney = useFormatCurrency()
  const [open, setOpen] = useState(false)
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
                <span className="text-gray-300">{i.name}</span>
                <span className="text-gray-400">{formatMoney(i.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
