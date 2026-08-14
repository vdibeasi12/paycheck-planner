"use client"

import { useState } from "react"

function money(n: number): string {
  if (!isFinite(n)) return "--"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

const COVERAGE_OPTIONS = [3, 6, 9, 12]

export default function EmergencyFundCalculator() {
  const [expenses, setExpenses] = useState("")
  const [months, setMonths] = useState(3)
  const [current, setCurrent] = useState("")
  const [monthlyAmount, setMonthlyAmount] = useState("")

  const expensesNum = parseFloat(expenses) || 0
  const currentNum = parseFloat(current) || 0
  const target = expensesNum * months
  const remaining = Math.max(0, target - currentNum)

  const monthlyNum = parseFloat(monthlyAmount) || 0
  const monthsToGoal = monthlyNum > 0 ? Math.ceil(remaining / monthlyNum) : 0

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm text-gray-300">
              Essential monthly expenses (rent, utilities, groceries, minimum debt payments)
            </span>
            <input
              type="number"
              min="0"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
              placeholder="2200"
              className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm text-gray-300">Months of expenses to cover</span>
            <div className="flex gap-2">
              {COVERAGE_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonths(m)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    months === m ? "bg-emerald-500 text-black" : "bg-[#020617] text-gray-400"
                  }`}
                >
                  {m} mo
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Already saved</span>
            <input
              type="number"
              min="0"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Amount you can save per month (optional)</span>
            <input
              type="number"
              min="0"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              placeholder="150"
              className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <p className="text-sm text-gray-300">Your emergency fund target</p>
        <p className="text-4xl font-bold text-white">{money(target)}</p>
        <p className="mt-2 text-sm text-gray-400">
          {remaining > 0 ? `${money(remaining)} left to save` : target > 0 ? "Target already reached" : "Enter your monthly expenses above"}
        </p>
        {monthlyNum > 0 && remaining > 0 && (
          <p className="mt-1 text-sm text-gray-400">
            At {money(monthlyNum)}/month, that's {monthsToGoal} month{monthsToGoal === 1 ? "" : "s"} away
          </p>
        )}
      </div>
    </div>
  )
}
