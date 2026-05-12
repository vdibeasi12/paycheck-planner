"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { calculatePayoff } from "@/lib/payoffEngine"

export default function DebtForecastEngine() {

  const [months, setMonths] = useState<number | null>(null)

  useEffect(() => {
    loadForecast()
  }, [])

  async function loadForecast() {

    try {

      const supabase = createClient()

      const { data } = await supabase
        .from("debts")
        .select("*")

      if (!data || data.length === 0) {
        setMonths(0)
        return
      }

      const result = calculatePayoff(data)

      setMonths(result.months)

    } catch (err) {
      console.error("Forecast error:", err)
      setMonths(0)
    }

  }

  return (

    <div className="bg-white p-6 rounded-2xl shadow">

      <h2 className="text-xl font-bold mb-4">
        Debt Forecast
      </h2>

      <p className="text-gray-600">
        Estimated months until debt free
      </p>

      <p className="text-3xl font-bold mt-2">
        {months ?? "..."} months
      </p>

    </div>

  )

}