"use client"

import safeArray from "@/lib/safeArray"

type Debt = {
  balance: number
  interest_rate: number
  minimum_payment: number
}

export default function AIInsight({ debts }: { debts: Debt[] }) {
  const safeDebts = safeArray(debts)

  // Estimate monthly interest loss
  const monthlyInterestLoss = safeDebts.reduce((sum, d) => {
    const monthlyRate = (Number(d.interest_rate || 0) / 100) / 12
    return sum + Number(d.balance || 0) * monthlyRate
  }, 0)

  // Rough savings if optimized (simple heuristic)
  const estimatedSavings = monthlyInterestLoss * 24

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      
      <h2 className="text-xl font-semibold mb-2">AI Insight</h2>

      {safeDebts.length === 0 ? (
        <p className="text-slate-400 text-sm">
          Add debts to receive insights.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-400 mb-3">
            You're losing approximately
          </p>

          <p className="text-2xl font-bold text-red-400 mb-4">
            ${monthlyInterestLoss.toFixed(0)} / month
          </p>

          <div className="bg-slate-800 rounded-xl p-4 mb-4">
            <p className="text-sm text-slate-400">
              With optimization, you could save:
            </p>
            <p className="text-xl font-semibold text-emerald-400">
              ${estimatedSavings.toFixed(0)}+
            </p>
          </div>

          <button
            onClick={() => (window.location.href = "/api/checkout")}
            className="bg-emerald-500 text-black px-4 py-2 rounded-lg font-semibold w-full"
          >
            Unlock Full Strategy
          </button>
        </>
      )}
    </div>
  )
}