"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

import {
  calculateDebtFreeDate,
  calculateTotalInterestPaid,
  calculatePotentialSavings
} from "@/lib/financeInsights"

import { Debt } from "@/lib/financeEngine"

export default function ReportPage() {

  const supabase = createClient()
  const router = useRouter()

  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDebts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }

        const { data, error } = await supabase
          .from("debts")
          .select("*")
          .eq("user_id", user.id)

        if (error) throw error
        setDebts(data || [])
      } catch (error) {
        console.error("Error fetching debts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDebts()
  }, [supabase, router])

  if (loading) {
    return <div className="text-white p-8">Loading...</div>
  }

  const debtFreeDate = calculateDebtFreeDate(debts)
  const totalInterest = calculateTotalInterestPaid(debts)
  const potentialSavings = calculatePotentialSavings(debts)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Financial Report</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-700 rounded-lg p-6">
            <h2 className="text-white text-lg mb-2">Debt-Free Date</h2>
            <p className="text-2xl font-bold text-green-400">
              {debtFreeDate ? new Date(debtFreeDate).toLocaleDateString() : "N/A"}
            </p>
          </div>

          <div className="bg-slate-700 rounded-lg p-6">
            <h2 className="text-white text-lg mb-2">Total Interest Paid</h2>
            <p className="text-2xl font-bold text-red-400">
              ${totalInterest.toFixed(2)}
            </p>
          </div>

          <div className="bg-slate-700 rounded-lg p-6">
            <h2 className="text-white text-lg mb-2">Potential Savings</h2>
            <p className="text-2xl font-bold text-blue-400">
              ${potentialSavings.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-6">
          <h2 className="text-white text-xl mb-4">Your Debts</h2>
          {debts.length === 0 ? (
            <p className="text-gray-300">No debts recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-2">Creditor</th>
                    <th className="text-left py-2">Balance</th>
                    <th className="text-left py-2">Rate</th>
                    <th className="text-left py-2">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map((debt) => (
                    <tr key={debt.id} className="border-b border-slate-600">
                      <td className="py-2">{debt.creditor_name}</td>
                      <td className="py-2">${debt.balance.toFixed(2)}</td>
                      <td className="py-2">{debt.interest_rate}%</td>
                      <td className="py-2">${debt.monthly_payment.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
