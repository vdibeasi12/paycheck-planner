"use client"

import { useState } from "react"

function money(n: number): string {
  if (!isFinite(n)) return "--"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

function monthsBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + "T00:00:00")
  const to = new Date(toIso + "T00:00:00")
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  return Math.max(0, months)
}

export default function SavingsGoalCalculator() {
  const [mode, setMode] = useState<"byDate" | "byAmount">("byDate")
  const [goal, setGoal] = useState("")
  const [current, setCurrent] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [monthlyAmount, setMonthlyAmount] = useState("")

  const goalNum = parseFloat(goal) || 0
  const currentNum = parseFloat(current) || 0
  const remaining = Math.max(0, goalNum - currentNum);

  const today = new Date().toISOString().slice(0, 10)
  const months = mode === "byDate" ? monthsBetween(today, targetDate) : 0
  const requiredMonthly = months > 0 ? remaining / months : 0

  const monthlyNum = parseFloat(monthlyAmount) || 0
  const monthsNeeded = monthlyNum > 0 ? Math.ceil(remaining / monthlyNum) : 0

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6">
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("byDate")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === "byDate" ? "bg-emerald-500 text-black" : "bg-[#020617] text-gray-400"
            }`}
          >
            I have a target date
          </button>
          <button
            type="button"
            onClick={() => setMode("byAmount")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === "byAmount" ? "bg-emerald-500 text-black" : "bg-[#020617] text-gray-400"
            }`}
          >
            I have a monthly amount
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Savings goal</span>
            <input
              type="number"
              min="0"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="3000"
              className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
            />
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

          {mode === "byDate" ? (
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm text-gray-300">Target date</span>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
              />
            </label>
          ) : (
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm text-gray-300">Amount you can save per month</span>
              <input
                type="number"
                min="0"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                placeholder="150"
                className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
              />
            </label>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        {mode === "byDate" ? (
          <>
            <p className="text-sm text-gray-300">You need to save per month</p>
            <p className="text-4xl font-bold text-white">{money(requiredMonthly)}</p>
            <p className="mt-2 text-sm text-gray-400">
              {months > 0 ? `${months} months until your target date` : "Set a target date above"}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-300">Time to reach your goal</p>
            <p className="text-4xl font-bold text-white">
              {monthsNeeded > 0 ? `${monthsNeeded} months` : "--"}
            </p>
            <p className="mt-2 text-sm text-gray-400">
              {remaining > 0 ? `${money(remaining)} left to save` : "Goal already reached"}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
