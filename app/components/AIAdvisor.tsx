"use client"

import { useEffect, useState } from "react"
import { Debt } from "@/lib/financeEngine"

export default function AIAdvisor({ debts }: { debts: Debt[] }) {
  const [advice, setAdvice] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getAdvice() {
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          body: JSON.stringify({ debts }),
        })

        const data = await res.json()
        setAdvice(data.advice)
      } catch (err) {
        console.error(err)
        setAdvice("Unable to load advice.")
      } finally {
        setLoading(false)
      }
    }

    getAdvice()
  }, [debts])

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="font-semibold mb-2">AI Financial Advisor</h2>

      {loading ? (
        <p className="text-gray-500">Analyzing your finances...</p>
      ) : (
        <p className="text-gray-700">{advice}</p>
      )}
    </div>
  )
}