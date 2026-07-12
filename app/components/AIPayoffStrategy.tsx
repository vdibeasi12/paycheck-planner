"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { simulatePayoff, type Debt, type Strategy } from "@/lib/financeEngine"

function months(n: number): string {
  if (n <= 0) return "—"
  const y = Math.floor(n / 12)
  const m = n % 12
  if (y === 0) return `${m} mo`
  if (m === 0) return `${y} yr`
  return `${y} yr ${m} mo`
}

function usd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

export default function AIPayoffStrategy() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [strategy, setStrategy] = useState<Strategy>("avalanche")

  useEffect(() => {
    let active = true
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (active) setLoading(false)
        return
      }
      const { data } = await supabase
        .from("debts")
        .select("*")
        .eq("user_id", user.id)
      if (active && data) {
        setDebts(
          data.map((d: any) => ({
            id: d.id,
            name: d.name,
            balance: Number(d.balance) || 0,
            interest_rate: Number(d.interest_rate) || 0,
            minimum_payment: Number(d.minimum_payment) || 0,
          }))
        )
      }
      if (active) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  const result = useMemo(() => simulatePayoff(debts, strategy, 0), [debts, strategy])
  const other = useMemo(
    () => simulatePayoff(debts, strategy === "avalanche" ? "snowball" : "avalanche", 0),
    [debts, strategy]
  )

  const ordered = useMemo(() => {
    const copy = [...debts]
    copy.sort((a, b) =>
      strategy === "snowball"
        ? a.balance - b.balance
        : b.interest_rate - a.interest_rate
    )
    return copy
  }, [debts, strategy])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <p className="text-gray-500">Building your payoff strategy…</p>
      </div>
    )
  }

  if (debts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-1">Your Payoff Strategy</h2>
        <p className="text-gray-500">Add debts to generate a personalized payoff plan.</p>
      </div>
    )
  }

  const interestDelta = other.totalInterest - result.totalInterest

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Your Payoff Strategy</h2>
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setStrategy("avalanche")}
            className={`px-3 py-1.5 text-sm rounded-md transition ${
              strategy === "avalanche" ? "bg-white shadow font-semibold" : "text-gray-500"
            }`}
          >
            Avalanche
          </button>
          <button
            onClick={() => setStrategy("snowball")}
            className={`px-3 py-1.5 text-sm rounded-md transition ${
              strategy === "snowball" ? "bg-white shadow font-semibold" : "text-gray-500"
            }`}
          >
            Snowball
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500">Debt-free in</p>
          <p className="text-2xl font-bold">{months(result.months)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500">Total interest</p>
          <p className="text-2xl font-bold">{usd(result.totalInterest)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500">
            vs. {strategy === "avalanche" ? "snowball" : "avalanche"}
          </p>
          <p
            className={`text-2xl font-bold ${
              interestDelta >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {interestDelta >= 0 ? "Saves " : "Costs "}
            {usd(Math.abs(interestDelta))}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {ordered.map((debt, i) => (
          <div
            key={debt.id ?? i}
            className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-blue-600 w-6 text-center">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{debt.name || "Debt"}</p>
                <p className="text-xs text-gray-500">
                  {debt.interest_rate}% APR
                </p>
              </div>
            </div>
            <p className="font-semibold">{usd(debt.balance)}</p>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
        {strategy === "avalanche"
          ? "Avalanche targets your highest-interest debt first, minimizing the total interest you pay."
          : "Snowball clears your smallest balance first, building momentum with quick wins."}
        {!result.paidOff &&
          " Heads up: your current minimum payments don't fully cover interest on at least one debt — increasing payments is needed to make progress."}
      </div>
    </div>
  )
}
