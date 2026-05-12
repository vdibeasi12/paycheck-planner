"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

export default function PaycheckPlanner() {

  const [income, setIncome] = useState(4000)
  const [bills, setBills] = useState(0)
  const [debt, setDebt] = useState(0)

  useEffect(() => {
    loadFinancials()
  }, [])

  async function loadFinancials() {

    const supabase = createClient()

    const { data: billsData } = await supabase
      .from("bills")
      .select("amount")

    const { data: debtData } = await supabase
      .from("debts")
      .select("minimum_payment")

    const totalBills =
      billsData?.reduce((sum: number, b: any) => sum + Number(b.amount), 0) || 0

    const totalDebt =
      debtData?.reduce((sum: number, d: any) => sum + Number(d.minimum_payment), 0) || 0

    setBills(totalBills)
    setDebt(totalDebt)

  }

  const remaining = income - bills - debt

  return (

    <div className="bg-white p-6 rounded-2xl shadow">

      <h2 className="text-xl font-bold mb-4">
        Paycheck Planner
      </h2>

      <div className="space-y-4">

        <div>
          <label className="text-sm text-gray-500">
            Monthly Income
          </label>

          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(Number(e.target.value))}
            className="border p-2 rounded w-full"
          />
        </div>

        <div className="flex justify-between">
          <span>Bills</span>
          <span>${bills}</span>
        </div>

        <div className="flex justify-between">
          <span>Debt Minimums</span>
          <span>${debt}</span>
        </div>

        <div className="flex justify-between font-bold">
          <span>Remaining Cash</span>
          <span>${remaining}</span>
        </div>

      </div>

    </div>

  )

}