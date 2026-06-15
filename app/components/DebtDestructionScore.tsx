"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

type Debt = {
  id: string
  balance: number
}

export default function DebtDestructionScore() {

  const [score, setScore] = useState(0)
  const [totalDebt, setTotalDebt] = useState(0)
  const [debtCount, setDebtCount] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {

    const supabase = createClient()

    const { data } = await supabase
      .from("debts")
      .select("balance")

    if (!data) return

    const total = data.reduce(
      (sum, d) => sum + Number(d.balance),
      0
    )

    const count = data.length

    setTotalDebt(total)
    setDebtCount(count)

    calculateScore(total, count)
  }

  function calculateScore(total: number, count: number) {

    let score = 100

    // High debt penalty
    if (total > 50000) score -= 30
    else if (total > 20000) score -= 20
    else if (total > 10000) score -= 10

    // Many debts penalty
    if (count >= 8) score -= 20
    else if (count >= 5) score -= 10

    if (score < 0) score = 0

    setScore(score)
  }

  let label = "Strong"
  let color = "text-green-600"

  if (score < 40) {
    label = "High Risk"
    color = "text-red-600"
  }
  else if (score < 70) {
    label = "Progressing"
    color = "text-yellow-600"
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow">

      <h2 className="text-xl font-bold mb-4">
        Debt Destruction Score
      </h2>

      <div className="text-center">

        <div className={`text-5xl font-bold ${color}`}>
          {score}
        </div>

        <div className="text-gray-600 mt-2">
          {label}
        </div>

      </div>

      <div className="mt-6 text-sm text-gray-500">

        <p>Total Debt: ${totalDebt.toLocaleString()}</p>
        <p>Active Debts: {debtCount}</p>

      </div>

    </div>
  )
}