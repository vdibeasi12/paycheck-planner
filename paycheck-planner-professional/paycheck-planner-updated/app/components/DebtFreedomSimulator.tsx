"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { calculatePayoff } from "@/lib/payoffEngine"

export default function DebtFreedomSimulator() {

  const [extra, setExtra] = useState(0)
  const [months, setMonths] = useState<number | null>(null)

  useEffect(() => {
    simulate()
  }, [extra])

  async function simulate() {

    const supabase = createClient()

    const { data } = await supabase
      .from("debts")
      .select("*")

    if (!data || data.length === 0) {
      setMonths(0)
      return
    }

    const modified = data.map((d: any) => ({
      ...d,
      minimum_payment: Number(d.minimum_payment) + extra
    }))

    const result = calculatePayoff(modified)

    setMonths(result.months)

  }

  return (

    <div className="bg-white p-6 rounded-2xl shadow">

      <h2 className="text-xl font-bold mb-4">
        Debt Freedom Simulator
      </h2>

      <input
        type="range"
        min="0"
        max="500"
        step="50"
        value={extra}
        onChange={(e) => setExtra(Number(e.target.value))}
        className="w-full"
      />

      <p className="mt-4">
        Extra Payment: <strong>${extra}</strong>
      </p>

      <p className="mt-2">
        Estimated Debt Free Time:
        <strong> {months ?? "..."} months</strong>
      </p>

    </div>

  )

}