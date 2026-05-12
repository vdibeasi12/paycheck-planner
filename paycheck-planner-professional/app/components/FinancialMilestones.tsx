"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

type Debt = {
  id: string
  balance: number
}

export default function FinancialMilestones() {
  const [totalDebt, setTotalDebt] = useState(0)
  const [currentDebt, setCurrentDebt] = useState(0)

  useEffect(() => {
    fetchDebts()
  }, [])

  async function fetchDebts() {
    const supabase = createClient()

    const { data } = await supabase
      .from("debts")
      .select("balance")

    if (!data) return

    const total = data.reduce((sum, d) => sum + Number(d.balance), 0)

    setCurrentDebt(total)

    // For MVP we assume original debt = current debt + estimated paid amount
    // Later we will store original balance in DB
    const estimatedOriginalDebt = total * 1.5

    setTotalDebt(estimatedOriginalDebt)
  }

  const paidOff = totalDebt - currentDebt
  const percentPaid = totalDebt === 0 ? 0 : (paidOff / totalDebt) * 100

  const milestones = [
    {
      label: "First $1,000 Paid Off",
      achieved: paidOff >= 1000
    },
    {
      label: "25% Debt Eliminated",
      achieved: percentPaid >= 25
    },
    {
      label: "50% Debt Eliminated",
      achieved: percentPaid >= 50
    },
    {
      label: "First $10,000 Paid Off",
      achieved: paidOff >= 10000
    }
  ]

  return (
    <div className="bg-white p-6 rounded-2xl shadow">
      <h2 className="text-xl font-bold mb-4">
        Financial Milestones
      </h2>

      <div className="space-y-3">
        {milestones.map((m, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg flex justify-between ${
              m.achieved
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <span>{m.label}</span>

            <span>
              {m.achieved ? "Unlocked 🎉" : "Locked"}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}