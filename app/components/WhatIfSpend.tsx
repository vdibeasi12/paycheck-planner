"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import { whatIfSpend, type SafeToSpendResult, type WhatIfVerdict } from "@/lib/safeToSpend"

type Props = {
  result: SafeToSpendResult
}

const VERDICT_COPY: Record<WhatIfVerdict, { label: string; className: string }> = {
  fine: { label: "That's fine.", className: "text-emerald-400" },
  tight: { label: "It'll be tight, but doable.", className: "text-amber-400" },
  "not-recommended": { label: "Not recommended.", className: "text-red-400" },
}

/**
 * "Can I afford this?" -- a pure client-side what-if against the current
 * Safe-to-Spend number (lib/safeToSpend.ts). No writes, nothing saved --
 * just answers the question before the user spends the money for real.
 */
export default function WhatIfSpend({ result }: Props) {
  const formatMoney = useFormatCurrency()
  const [amount, setAmount] = useState("")

  if (!result.hasIncome || result.missingPayDate || !result.nextPaycheckDate) return null

  const parsed = Number(amount)
  const valid = amount.trim() !== "" && !Number.isNaN(parsed) && parsed > 0
  const outcome = valid ? whatIfSpend(result, parsed) : null
  const copy = outcome ? VERDICT_COPY[outcome.verdict] : null

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0b1220] p-6 shadow-lg">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-emerald-400" />
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">Can I afford this?</h2>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-gray-400">$</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="200"
          aria-label="Amount to check"
          className="w-32 rounded-lg border border-gray-700 bg-[#0f172a] px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {outcome && copy && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className={`font-semibold ${copy.className}`}>{copy.label}</p>
          <p className="mt-1 text-sm text-gray-400">
            That changes your safe-to-spend from{" "}
            <span className="text-gray-200">{formatMoney(result.safeToSpend)}</span> to{" "}
            <span className={outcome.newSafeToSpend >= 0 ? "text-gray-200" : "text-red-400"}>
              {formatMoney(outcome.newSafeToSpend)}
            </span>{" "}
            until your next paycheck.
          </p>
        </div>
      )}
    </div>
  )
}
