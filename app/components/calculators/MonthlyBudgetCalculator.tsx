"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"

function money(n: number): string {
  if (!isFinite(n)) return "--"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

type Expense = { id: string; label: string; amount: string }

const DEFAULT_EXPENSES: Expense[] = [
  { id: "1", label: "Rent / mortgage", amount: "" },
  { id: "2", label: "Utilities", amount: "" },
  { id: "3", label: "Groceries", amount: "" },
  { id: "4", label: "Transportation", amount: "" },
  { id: "5", label: "Debt payments", amount: "" },
]

export default function MonthlyBudgetCalculator() {
  const [income, setIncome] = useState("")
  const [expenses, setExpenses] = useState<Expense[]>(DEFAULT_EXPENSES)

  const incomeNum = parseFloat(income) || 0
  const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const leftover = incomeNum - totalExpenses

  function updateExpense(id: string, field: "label" | "amount", value: string) {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)))
  }

  function addExpense() {
    setExpenses((prev) => [...prev, { id: String(Date.now()), label: "", amount: "" }])
  }

  function removeExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6">
        <label className="block">
          <span className="mb-1 block text-sm text-gray-300">Monthly income (take-home)</span>
          <input
            type="number"
            min="0"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="4000"
            className="w-full max-w-xs rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6">
        <p className="mb-3 text-sm font-semibold text-gray-300">Expenses</p>
        <div className="space-y-2">
          {expenses.map((e) => (
            <div key={e.id} className="flex gap-2">
              <input
                type="text"
                value={e.label}
                onChange={(ev) => updateExpense(e.id, "label", ev.target.value)}
                placeholder="Expense name"
                className="flex-1 rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              />
              <input
                type="number"
                min="0"
                value={e.amount}
                onChange={(ev) => updateExpense(e.id, "amount", ev.target.value)}
                placeholder="0"
                className="w-28 rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => removeExpense(e.id)}
                aria-label="Remove expense"
                className="rounded-lg border border-gray-700 px-2 text-gray-400 hover:border-red-500/50 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addExpense}
          className="mt-3 flex items-center gap-1 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
        >
          <Plus size={16} /> Add expense
        </button>
      </div>

      <div
        className={`rounded-2xl border p-6 ${
          leftover >= 0
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-red-500/30 bg-red-500/10"
        }`}
      >
        <p className="text-sm text-gray-300">{leftover >= 0 ? "Left over" : "Over budget by"}</p>
        <p className="text-4xl font-bold text-white">{money(Math.abs(leftover))}</p>
        <p className="mt-2 text-sm text-gray-400">
          Total expenses: {money(totalExpenses)} of {money(incomeNum)} income
        </p>
      </div>
    </div>
  )
}
