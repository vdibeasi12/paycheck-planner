"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { calculatePayoff } from "@/lib/payoffEngine"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"

export default function InterestLeakDetector() {
  const formatMoney = useFormatCurrency()
  const [minimumInterest, setMinimumInterest] = useState(0)
  const [optimizedInterest, setOptimizedInterest] = useState(0)

  useEffect(() => {
    loadDebts()
  }, [])

  async function loadDebts() {

    const supabase = createClient()

    const { data } = await supabase
      .from("debts")
      .select("*")

    if (!data || data.length === 0) return

    const minimumScenario = calculatePayoff(data)

    const optimizedDebts = data.map((d: any) => ({
      ...d,
      minimum_payment: Number(d.minimum_payment) + 100
    }))

    const optimizedScenario = calculatePayoff(optimizedDebts)

    setMinimumInterest(minimumScenario.totalInterest)
    setOptimizedInterest(optimizedScenario.totalInterest)
  }

  const saved = minimumInterest - optimizedInterest

  return (
    <div className="bg-[#0f172a] p-6 rounded-2xl shadow">

      <h2 className="text-xl font-bold mb-4">
        Interest Leak Detector
      </h2>

      <div className="space-y-2">

        <p>
          Minimum Payments Interest:
          <strong> {formatMoney(minimumInterest)}</strong>
        </p>

        <p>
          Optimized Strategy Interest:
          <strong> {formatMoney(optimizedInterest)}</strong>
        </p>

        <p className="text-green-600 font-semibold">
          Interest Saved: {formatMoney(saved)}
        </p>

      </div>

    </div>
  )
}