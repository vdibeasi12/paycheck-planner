"use client"

import { useState } from "react"

function money(n: number): string {
  if (!isFinite(n)) return "--"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

export default function FiftyThirtyTwentyCalculator() {
  const [income, setIncome] = useState("")

  const incomeNum = parseFloat(income) || 0
  const needs = incomeNum * 0.5
  const wants = incomeNum * 0.3
  const savings = incomeNum * 0.2

  const rows = [
    { label: "Needs (rent, bills, groceries, minimum debt payments)", pct: 50, amount: needs, color: "bg-emerald-500" },
    { label: "Wants (dining out, subscriptions, fun money)", pct: 30, amount: wants, color: "bg-sky-500" },
    { label: "Savings & extra debt payoff", pct: 20, amount: savings, color: "bg-amber-500" },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6">
        <label className="block">
          <span className="mb-1 block text-sm text-gray-300">Monthly take-home income</span>
          <input
            type="number"
            min="0"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="4000"
            className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
          />
        </label>
      </div>

      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.label} className="rounded-2xl border border-gray-700 bg-[#0f172a] p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-gray-300">{r.label}</p>
              <p className="text-lg font-bold text-white">{money(r.amount)}</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-800">
              <div className={`h-full ${r.color}`} style={{ width: `${r.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        50/30/20 is a starting point, not a rule -- in a high cost-of-living area "needs" often runs
        higher than 50%. Adjust the splits to fit your actual bills.
      </p>
    </div>
  )
}
