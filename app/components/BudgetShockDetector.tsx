"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import MetricCard from "./MetricCard"

export default function BudgetShockDetector() {
  const [billsTotal, setBillsTotal] = useState(0)
  const [debtMinimums, setDebtMinimums] = useState(0)

  // Temporary default income until paycheck system expands
  const estimatedIncome = 4000

  useEffect(() => {
    loadFinancials()
  }, [])

  async function loadFinancials() {
    const supabase = createClient()

    const { data: bills } = await supabase
      .from("bills")
      .select("amount")

    const { data: debts } = await supabase
      .from("debts")
      .select("minimum_payment")

    if (bills) {
      const totalBills = bills.reduce(
        (sum, bill) => sum + Number(bill.amount),
        0
      )
      setBillsTotal(totalBills)
    }

    if (debts) {
      const totalDebt = debts.reduce(
        (sum, debt) => sum + Number(debt.minimum_payment),
        0
      )
      setDebtMinimums(totalDebt)
    }
  }

  const totalRequired = billsTotal + debtMinimums
  const remaining = estimatedIncome - totalRequired

  let riskLevel = "Safe"
  let color = "text-green-600"

  if (remaining < 0) {
    riskLevel = "Danger"
    color = "text-red-600"
  } else if (remaining < estimatedIncome * 0.15) {
    riskLevel = "Warning"
    color = "text-yellow-600"
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow">

      <h2 className="text-xl font-bold mb-4">
        Budget Shock Detector
      </h2>

      <div className="grid md:grid-cols-3 gap-4 mb-4">

        <MetricCard
          title="Monthly Income"
          value={`$${estimatedIncome.toLocaleString()}`}
        />

        <MetricCard
          title="Required Payments"
          value={`$${totalRequired.toLocaleString()}`}
        />

        <MetricCard
          title="Remaining Buffer"
          value={`$${remaining.toLocaleString()}`}
        />

      </div>

      <div className="border-t pt-4">

        <h3 className={`text-lg font-semibold ${color}`}>
          Risk Level: {riskLevel}
        </h3>

        <p className="text-gray-600 mt-1">
          This measures how resilient your finances are if income drops or expenses increase.
        </p>

      </div>

    </div>
  )
}