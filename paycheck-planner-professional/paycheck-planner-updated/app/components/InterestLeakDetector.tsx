"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { calculatePayoff } from "@/lib/payoffEngine"

export default function InterestLeakDetector() {

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
    <div className="bg-white p-6 rounded-2xl shadow">

      <h2 className="text-xl font-bold mb-4">
        Interest Leak Detector
      </h2>

      <div className="space-y-2">

        <p>
          Minimum Payments Interest:
          <strong> ${minimumInterest.toLocaleString()}</strong>
        </p>

        <p>
          Optimized Strategy Interest:
          <strong> ${optimizedInterest.toLocaleString()}</strong>
        </p>

        <p className="text-green-600 font-semibold">
          Interest Saved: ${saved.toLocaleString()}
        </p>

      </div>

    </div>
  )
}