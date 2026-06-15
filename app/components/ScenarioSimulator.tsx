"use client"

import { useState } from "react"
import { simulatePayoff } from "@/lib/financeEngine"

interface Debt {
  id: string
  name: string
  balance: number
  interest: number
  minimum: number
}

interface Props {
  debts: Debt[]
  strategy: "snowball" | "avalanche"
}

export default function ScenarioSimulator({ debts, strategy }: Props) {

  const [extraPayment, setExtraPayment] = useState(0)

  if (!debts || debts.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-2">
          Scenario Simulator
        </h2>
        <p className="text-gray-500">
          Add debts to simulate payoff scenarios.
        </p>
      </div>
    )
  }

  const engineDebts = debts.map((d) => ({
    id: d.id,
    name: d.name,
    balance: d.balance,
    interest_rate: d.interest,
    minimum_payment: d.minimum,
  }))

  const base = simulatePayoff(engineDebts, strategy, 0)
  const scenario = simulatePayoff(engineDebts, strategy, extraPayment)

  const monthsSaved = base.months - scenario.months
  const interestSaved = base.totalInterest - scenario.totalInterest

  return (

    <div className="bg-white p-6 rounded-xl shadow space-y-6">

      <div>
        <h2 className="text-xl font-semibold">
          Scenario Simulator
        </h2>

        <p className="text-sm text-gray-500">
          Test how extra payments speed up your debt payoff.
        </p>
      </div>

      <div className="flex items-center gap-4">

        <label className="text-sm font-medium">
          Extra Monthly Payment
        </label>

        <input
          type="number"
          value={extraPayment}
          onChange={(e)=>setExtraPayment(Number(e.target.value))}
          className="border rounded px-3 py-2 w-40"
        />

      </div>

      <div className="grid md:grid-cols-3 gap-4">

        <div className="bg-gray-50 p-4 rounded-lg">

          <p className="text-sm text-gray-500">
            Debt Free In
          </p>

          <p className="text-lg font-semibold">
            {scenario.months} months
          </p>

        </div>

        <div className="bg-gray-50 p-4 rounded-lg">

          <p className="text-sm text-gray-500">
            Months Saved
          </p>

          <p className="text-lg font-semibold text-green-600">
            {monthsSaved > 0 ? monthsSaved : 0}
          </p>

        </div>

        <div className="bg-gray-50 p-4 rounded-lg">

          <p className="text-sm text-gray-500">
            Interest Saved
          </p>

          <p className="text-lg font-semibold text-green-600">
            ${interestSaved > 0 ? interestSaved.toLocaleString() : 0}
          </p>

        </div>

      </div>

    </div>

  )
}