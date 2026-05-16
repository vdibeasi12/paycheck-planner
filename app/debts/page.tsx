"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Debt } from "@/lib/financeEngine"
import DebtForm from "@/components/DebtForm"
import DebtTable from "@/components/DebtTable"
import DebtProgress from "@/components/DebtProgress"

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Manage Debts</h1>

        {/* DEBT FORM */}
        <DebtForm onDebtAdded={(newDebt) => setDebts([...debts, newDebt])} />

        {/* DEBT PROGRESS */}
        <DebtProgress />

        {/* DEBT TABLE */}
        <DebtTable />

      </div>
    </div>
  )
}
