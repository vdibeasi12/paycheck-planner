"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"

export default function AIDebtAdvisor() {

  const [advice, setAdvice] = useState("Analyzing debts...")

  useEffect(() => {
    analyzeDebts()
  }, [])

  async function analyzeDebts() {

    const supabase = createClient()

    const { data } = await supabase
      .from("debts")
      .select("*")

    if (!data || data.length === 0) {
      setAdvice("Add debts to receive AI advice.")
      return
    }

    const highestInterest = [...data].sort(
      (a: any, b: any) => b.interest_rate - a.interest_rate
    )[0]

    setAdvice(
      `Focus extra payments on "${highestInterest.name}" (${highestInterest.interest_rate}% interest). This will reduce your total interest the fastest.`
    )

  }

  return (

    <div className="bg-white p-6 rounded-2xl shadow">

      <h2 className="text-xl font-bold mb-4">
        AI Debt Advisor
      </h2>

      <p className="text-gray-700">
        {advice}
      </p>

    </div>

  )

}