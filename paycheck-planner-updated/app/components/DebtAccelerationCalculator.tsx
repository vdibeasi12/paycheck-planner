"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { calculateDebtFreeTimeline, Debt } from "@/lib/payoffEngine"

export default function DebtAccelerationCalculator() {

  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    loadDebts()
  }, [])

  async function loadDebts() {

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: debts } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", user.id)

    if (!debts) return

    const formatted: Debt[] = debts.map((d) => ({
      id: d.id,
      name: d.name,
      balance: Number(d.balance),
      interest_rate: Number(d.interest_rate),
      minimum_payment: Number(d.minimum_payment)
    }))

    const baseline = calculateDebtFreeTimeline(formatted)

    const extraOptions = [50, 100, 250, 500]

    const simulations = extraOptions.map((extra) => {

      const result = calculateDebtFreeTimeline(
        formatted,
        "snowball",
        extra
      )

      return {
        extra,
        monthsSaved: baseline.months - result.months
      }
    })

    setResults(simulations)
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">

      <h2 className="text-xl font-semibold mb-6">
        Debt Acceleration Calculator
      </h2>

      <div className="space-y-3">

        {results.map((r, index) => (

          <div
            key={index}
            className="flex justify-between border-b pb-2"
          >

            <span className="font-medium">
              + ${r.extra}/month
            </span>

            <span className="text-green-600 font-semibold">
              {r.monthsSaved} months faster
            </span>

          </div>

        ))}

      </div>

    </div>
  )
}