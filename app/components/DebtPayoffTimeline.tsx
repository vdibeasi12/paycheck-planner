"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { calculatePayoff } from "@/lib/payoffEngine"

export default function DebtPayoffTimeline() {

  const [months, setMonths] = useState(0)

  useEffect(() => {
    loadTimeline()
  }, [])

  async function loadTimeline() {

    const supabase = createClient()

    const { data } = await supabase
      .from("debts")
      .select("*")

    if (!data || data.length === 0) return

    const result = calculatePayoff(data)

    setMonths(result.months)
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow">

      <h2 className="text-xl font-bold mb-4">
        Debt Payoff Timeline
      </h2>

      <p className="text-gray-600">
        Estimated time to eliminate all debts:
      </p>

      <p className="text-3xl font-bold mt-2">
        {months} months
      </p>

    </div>
  )
}