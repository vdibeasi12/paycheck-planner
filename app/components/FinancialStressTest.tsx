"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

export default function FinancialStressTest() {

  const [risk, setRisk] = useState<string>("Calculating...")

  useEffect(() => {
    checkRisk()
  }, [])

  async function checkRisk() {

    try {

      const supabase = createClient()

      const { data: bills } = await supabase
        .from("bills")
        .select("amount")

      const { data: debts } = await supabase
        .from("debts")
        .select("minimum_payment")

      const totalBills =
        bills?.reduce((sum: number, b: any) => sum + Number(b.amount), 0) || 0

      const totalDebt =
        debts?.reduce((sum: number, d: any) => sum + Number(d.minimum_payment), 0) || 0

      const monthlyLoad = totalBills + totalDebt

      if (monthlyLoad < 1000) {
        setRisk("Low")
      } else if (monthlyLoad < 3000) {
        setRisk("Moderate")
      } else {
        setRisk("High")
      }

    } catch (err) {
      console.error("Stress test error:", err)
      setRisk("Unknown")
    }

  }

  return (

    <div className="bg-white p-6 rounded-2xl shadow">

      <h2 className="text-xl font-bold mb-4">
        Financial Stress Test
      </h2>

      <p className="text-gray-600">
        Estimated financial pressure level
      </p>

      <p className="text-2xl font-bold mt-2">
        {risk}
      </p>

    </div>

  )

}