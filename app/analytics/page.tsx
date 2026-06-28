"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { canUseAdvancedAnalytics } from "@/lib/permissions"
import { Lock } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

export default function Analytics() {
  const [debts, setDebts] = useState<any[]>([])
  const [totalDebt, setTotalDebt] = useState(0)
  const [avgInterest, setAvgInterest] = useState(0)
  const [plan, setPlan] = useState<string>("free")
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    init()
  }, [])

  async function init() {
    try {
      const { data: userAuth } = await supabase.auth.getUser()
      if (userAuth.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan, is_admin")
          .eq("id", userAuth.user.id)
          .maybeSingle()
        if (profile) {
          setPlan((profile.plan as string) || "free")
          setIsAdmin(!!profile.is_admin)
        }
      }
      await loadDebts()
    } finally {
      setReady(true)
    }
  }

  async function loadDebts() {
    const { data } = await supabase
      .from("debts")
      .select("name, balance, interest_rate")

    if (!data) return

    setDebts(data)

    let total = 0
    let interestTotal = 0

    data.forEach((d: any) => {
      total += Number(d.balance || 0)
      interestTotal += Number(d.interest_rate || 0)
    })

    setTotalDebt(total)

    if (data.length > 0) {
      setAvgInterest(Number((interestTotal / data.length).toFixed(2)))
    }
  }

  const effectivePlan = isAdmin ? "connected" : plan
  const allowed = canUseAdvancedAnalytics(effectivePlan)

  const COLORS = ["#2563eb", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"]

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#020617] p-10 text-gray-400">
        Loading analytics...
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-[#020617] p-10 text-white">
        <h1 className="mb-8 text-3xl font-bold">Debt Analytics</h1>
        <div className="mx-auto max-w-xl rounded-xl border border-amber-500/40 bg-amber-500/10 p-8 text-center">
          <Lock className="mx-auto mb-3 text-amber-300" size={28} />
          <h2 className="mb-2 text-2xl font-bold text-amber-200">
            Advanced analytics is an Accelerate feature
          </h2>
          <p className="mb-6 text-sm text-amber-200/80">
            Upgrade to Accelerate to unlock detailed breakdowns of your balances
            and interest across every debt.
          </p>
          <Link
            href="/pricing"
            className="inline-block rounded-md bg-amber-500 px-4 py-2 font-semibold text-black hover:bg-amber-400"
          >
            View plans
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617] p-10 text-white">
      <h1 className="mb-8 text-3xl font-bold">Debt Analytics</h1>

      <div className="mb-10 grid grid-cols-3 gap-6">
        <div className="rounded bg-gray-900 p-6">
          <p>Total Debt</p>
          <p className="text-2xl font-bold">${totalDebt.toFixed(2)}</p>
        </div>

        <div className="rounded bg-gray-900 p-6">
          <p>Number of Debts</p>
          <p className="text-2xl font-bold">{debts.length}</p>
        </div>

        <div className="rounded bg-gray-900 p-6">
          <p>Average Interest</p>
          <p className="text-2xl font-bold">{avgInterest}%</p>
        </div>
      </div>

      <div className="h-[400px] rounded bg-gray-900 p-8">
        {debts.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={debts}
                dataKey="balance"
                nameKey="name"
                outerRadius={140}
                label
              >
                {debts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            Add debts to see your analytics.
          </div>
        )}
      </div>
    </div>
  )
}