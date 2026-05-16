"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Debt } from "@/lib/financeEngine"

export default function DebtsPage() {
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
    return <div className="text-white p-8">Loading debts...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Manage Debts</h1>
        
        <div className="bg-slate-700 rounded-lg p-6">
          <p className="text-white text-lg">
            Total Debts: <span className="font-bold text-green-400">{debts.length}</span>
          </p>
          <p className="text-gray-300 mt-2">Total Balance: ${debts.reduce((sum, d) => sum + d.balance, 0).toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}
