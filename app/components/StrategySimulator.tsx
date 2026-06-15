"use client"

import { useState } from "react"
import { Debt, calculateDebtFreeMonths } from "@/lib/financeEngine"

export default function StrategySimulator({
  debts,
}: {
  debts: Debt[]
}) {
  const [strategy, setStrategy] = useState<"snowball" | "avalanche">(
    "avalanche"
  )

  const months = calculateDebtFreeMonths(debts, strategy)

  if (!debts || debts.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow">
        No data for simulation
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="font-semibold mb-4">Strategy Simulator</h2>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setStrategy("snowball")}
          className={`px-3 py-1 rounded ${
            strategy === "snowball"
              ? "bg-black text-white"
              : "bg-gray-200"
          }`}
        >
          Snowball
        </button>

        <button
          onClick={() => setStrategy("avalanche")}
          className={`px-3 py-1 rounded ${
            strategy === "avalanche"
              ? "bg-black text-white"
              : "bg-gray-200"
          }`}
        >
          Avalanche
        </button>
      </div>

      <p className="text-lg font-semibold">
        Debt-free in {months} months
      </p>
    </div>
  )
}