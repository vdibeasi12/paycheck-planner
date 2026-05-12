"use client"

import { calculateDebtFreePlan } from "@/lib/debtFreeEngine"
import safeArray from "@/lib/safeArray"

type Debt = {
  balance: number
  interest_rate: number
  minimum_payment: number
}

export default function DebtFreePlan({ debts }: { debts: Debt[] }) {
  const result = calculateDebtFreePlan(safeArray(debts))

  if (!result) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="text-slate-400 text-sm">
          Add debts to see your debt-free plan.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      
      <h2 className="text-xl font-semibold">Debt-Free Plan</h2>

      {/* CURRENT */}
      <div className="bg-slate-800 p-4 rounded-xl">
        <p className="text-sm text-slate-400">Current Plan</p>
        <p className="text-lg font-semibold">{result.currentDate}</p>
        <p className="text-sm text-slate-400">
          {result.currentMonths} months
        </p>
      </div>

      {/* OPTIMIZED */}
      <div className="bg-slate-800 p-4 rounded-xl border border-emerald-500">
        <p className="text-sm text-slate-400">Optimized Plan</p>
        <p className="text-lg font-semibold text-emerald-400">
          {result.optimizedDate}
        </p>
        <p className="text-sm text-slate-400">
          {result.optimizedMonths} months
        </p>
      </div>

      {/* SAVINGS */}
      <div className="bg-slate-800 p-4 rounded-xl">
        <p className="text-sm text-slate-400">You Save</p>
        <p className="text-lg font-semibold text-emerald-400">
          {result.monthsSaved} months + $
          {result.interestSaved.toFixed(0)}
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={() => (window.location.href = "/api/checkout")}
        className="bg-emerald-500 text-black px-4 py-2 rounded-lg font-semibold w-full"
      >
        Optimize My Plan
      </button>

    </div>
  )
}