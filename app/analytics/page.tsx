"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { canUseAdvancedAnalytics } from "@/lib/permissions"
import { Lock } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import { debtTypeLabel } from "@/lib/debtTypes"

interface AnalyticsDebt {
  id: string
  name: string
  balance: number
  interest_rate: number
  minimum_payment: number
  debt_type: string | null
  escrow_payment: number | null
}

export default function Analytics() {
  const formatMoney = useFormatCurrency()
  const [debts, setDebts] = useState<AnalyticsDebt[]>([])
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
    // QA fix (Aug 15 2026): this used to select only name/balance/
    // interest_rate -- "useless info," per Vince's feedback, since it
    // couldn't show minimum payments, debt type, or escrow, and the pie
    // chart rendered raw unformatted numbers. Now pulls everything the
    // Debts page tracks so this page can show the same level of detail.
    const { data } = await supabase
      .from("debts")
      .select("id, name, balance, interest_rate, minimum_payment, debt_type, escrow_payment")

    if (!data) return
    setDebts(data as AnalyticsDebt[])
  }

  const activeDebts = useMemo(() => debts.filter((d) => (Number(d.balance) || 0) > 0), [debts])

  const totalDebt = useMemo(
    () => activeDebts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0),
    [activeDebts]
  )

  const totalMonthlyPayments = useMemo(
    () => activeDebts.reduce((sum, d) => sum + (Number(d.minimum_payment) || 0), 0),
    [activeDebts]
  )

  // Weighted by balance, not a plain average of APRs -- a plain average
  // treats a $500 card at 24% the same as a $250,000 mortgage at 2.88%,
  // which misrepresents what's actually driving your interest cost.
  const weightedAvgInterest = useMemo(() => {
    if (totalDebt === 0) return 0
    const weighted = activeDebts.reduce(
      (sum, d) => sum + (Number(d.balance) || 0) * (Number(d.interest_rate) || 0),
      0
    )
    return weighted / totalDebt
  }, [activeDebts, totalDebt])

  const byType = useMemo(() => {
    const groups = new Map<string, { balance: number; count: number }>()
    activeDebts.forEach((d) => {
      const key = d.debt_type || ""
      const existing = groups.get(key) || { balance: 0, count: 0 }
      existing.balance += Number(d.balance) || 0
      existing.count += 1
      groups.set(key, existing)
    })
    return Array.from(groups.entries())
      .map(([type, v]) => ({ type, label: debtTypeLabel(type), ...v }))
      .sort((a, b) => b.balance - a.balance)
  }, [activeDebts])

  const debtsByBalance = useMemo(
    () => [...activeDebts].sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0)),
    [activeDebts]
  )

  const effectivePlan = isAdmin ? "connected" : plan
  const allowed = canUseAdvancedAnalytics(effectivePlan)

  const COLORS = ["#2563eb", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"]

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
      <h1 className="mb-2 text-3xl font-bold">Debt Analytics</h1>
      <p className="mb-8 text-sm text-gray-400">
        A closer look at what you owe, debt by debt.{" "}
        <Link href="/amortization" className="text-blue-400 hover:text-blue-300">
          See your payoff timeline &rarr;
        </Link>
      </p>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
        <div className="rounded bg-gray-900 p-6 min-w-0">
          <p className="text-gray-400">Total Debt</p>
          <p className="text-2xl font-bold truncate">{formatMoney(totalDebt)}</p>
        </div>

        <div className="rounded bg-gray-900 p-6 min-w-0">
          <p className="text-gray-400">Total Monthly Payments</p>
          <p className="text-2xl font-bold truncate">{formatMoney(totalMonthlyPayments)}</p>
        </div>

        <div className="rounded bg-gray-900 p-6 min-w-0">
          <p className="text-gray-400">Number of Debts</p>
          <p className="text-2xl font-bold truncate">{activeDebts.length}</p>
        </div>

        <div className="rounded bg-gray-900 p-6 min-w-0">
          <p className="text-gray-400">Avg Interest</p>
          <p className="text-2xl font-bold truncate">{weightedAvgInterest.toFixed(2)}%</p>
          <p className="mt-1 text-xs text-gray-500">weighted by balance</p>
        </div>
      </div>

      <div className="mb-10 h-[400px] rounded bg-gray-900 p-8">
        {activeDebts.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={activeDebts}
                dataKey="balance"
                nameKey="name"
                outerRadius={140}
                label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
              >
                {activeDebts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: unknown, _name: unknown, item: any) => [
                  formatMoney(Number(value) || 0),
                  item?.payload?.name || "Balance",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            Add debts to see your analytics.
          </div>
        )}
      </div>

      {byType.length > 1 && (
        <div className="mb-10 rounded bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Balance by debt type</h2>
          <div className="space-y-2">
            {byType.map((t) => (
              <div key={t.type || "unset"} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">
                  {t.label} <span className="text-gray-500">({t.count})</span>
                </span>
                <span className="font-semibold">
                  {formatMoney(t.balance)}{" "}
                  <span className="text-gray-500">
                    ({totalDebt > 0 ? ((t.balance / totalDebt) * 100).toFixed(0) : 0}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeDebts.length > 0 && (
        <div className="rounded bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Every debt, side by side</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-gray-400">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Balance</th>
                  <th className="pb-2 pr-4 font-medium">% of total</th>
                  <th className="pb-2 pr-4 font-medium">APR</th>
                  <th className="pb-2 font-medium">Monthly payment</th>
                </tr>
              </thead>
              <tbody>
                {debtsByBalance.map((d) => (
                  <tr key={d.id} className="border-b border-gray-800/60">
                    <td className="py-2 pr-4 font-semibold">{d.name}</td>
                    <td className="py-2 pr-4 text-gray-300">{debtTypeLabel(d.debt_type)}</td>
                    <td className="py-2 pr-4">{formatMoney(Number(d.balance) || 0)}</td>
                    <td className="py-2 pr-4 text-gray-400">
                      {totalDebt > 0 ? (((Number(d.balance) || 0) / totalDebt) * 100).toFixed(0) : 0}%
                    </td>
                    <td className="py-2 pr-4">{(Number(d.interest_rate) || 0).toFixed(2)}%</td>
                    <td className="py-2">
                      {formatMoney(Number(d.minimum_payment) || 0)}
                      {Number(d.escrow_payment) > 0 && (
                        <span className="ml-1 text-xs text-gray-500">
                          (incl. {formatMoney(Number(d.escrow_payment))} escrow)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
