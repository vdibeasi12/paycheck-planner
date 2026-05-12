"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

import {
  calculateDebtFreeDate,
  calculateTotalInterestPaid,
  calculatePotentialSavings
} from "@/lib/financeInsights"

import { Debt } from "@/lib/financeEngine"

export default function ReportPage() {

  const supabase = createClientComponentClient()
  const router = useRouter()

  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    const loadData = async () => {

      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from("debts")
        .select("*")
        .eq("user_id", user.id)

      setDebts(data || [])
      setLoading(false)
    }

    loadData()

  }, [supabase])

  if (loading) {
    return (
      <div className="p-10 text-center">
        Loading report...
      </div>
    )
  }

  const debtFreeDate = calculateDebtFreeDate(debts)
  const interest = calculateTotalInterestPaid(debts)
  const savings = calculatePotentialSavings(debts, 150)

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">

      <div className="bg-white p-10 rounded-2xl shadow max-w-xl w-full text-center space-y-6">

        <h1 className="text-3xl font-bold">
          My Debt Freedom Plan
        </h1>

        <div className="text-4xl font-bold text-green-600">
          {debtFreeDate}
        </div>

        <p className="text-gray-500">
          Estimated Debt Free Date
        </p>

        <div className="border-t pt-6 space-y-2">

          <div className="flex justify-between">
            <span>Total Interest</span>
            <span>${interest}</span>
          </div>

          <div className="flex justify-between">
            <span>Potential Savings</span>
            <span className="text-green-600">
              ${savings}
            </span>
          </div>

        </div>

        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href)
            alert("Link copied!")
          }}
          className="bg-black text-white px-6 py-3 rounded-lg w-full"
        >
          Copy Share Link
        </button>

        {/* VIRAL CTA */}
        <button
          onClick={() => router.push("/")}
          className="bg-green-600 text-white px-6 py-3 rounded-lg w-full text-lg font-semibold"
        >
          Start Your Plan Free
        </button>

      </div>

    </div>
  )
}