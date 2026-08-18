"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { canUseAdvancedAnalytics } from "@/lib/permissions"
import { Lock, Flame, TrendingUp, Clock, AlertTriangle } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import { debtTypeLabel } from "@/lib/debtTypes"
import { simulate, monthLabel, type Debt as SimDebt } from "@/lib/payoffSimulate"
import FinancialHealthScore from "@/app/components/FinancialHealthScore"

interface AnalyticsDebt {
  id: string
  name: string
  balance: number
  original_balance: number | null
  interest_rate: number
  minimum_payment: number
  debt_type: string | null
  escrow_payment: number | null
}

const tooltipStyle = {
  background: "#0b1220",
  border: "1px solid #1f2937",
  borderRadius: 8,
  color: "#fff",
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
    //
    // Aug 18 2026: added original_balance -- the balance-by-debt pie chart
    // was a near-exact duplicate of the one already on the Dashboard, and
    // everything below it (balance-by-type, the debt table) was really
    // just the Debts page reformatted. Nothing on this page answered a
    // question the Dashboard or Payoff Plan didn't already answer.
    // original_balance unlocks "how much have you actually paid down,"
    // which neither of those pages compute (Dashboard's percent-paid stat
    // is hardcoded to 0 -- worth a separate fix, flagged to Vince).
    const { data } = await supabase
      .from("debts")
      .select(
        "id, name, balance, original_balance, interest_rate, minimum_payment, debt_type, escrow_payment"
      )

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

  // What each debt is actually costing you *this month* in pure interest --
  // balance x monthly rate. Ranking by this (not balance) is the point: a
  // smaller, high-APR debt can cost more per month than a much larger,
  // low-APR one, and that's easy to miss when every other view on the site
  // sorts by balance.
  const costRanking = useMemo(() => {
    return activeDebts
      .map((d) => ({
        id: d.id,
        name: d.name,
        monthlyInterest: (Number(d.balance) || 0) * (Number(d.interest_rate) || 0) / 100 / 12,
      }))
      .sort((a, b) => b.monthlyInterest - a.monthlyInterest)
  }, [activeDebts])

  const totalMonthlyInterest = useMemo(
    () => costRanking.reduce((sum, d) => sum + d.monthlyInterest, 0),
    [costRanking]
  )

  // Progress since each debt was first added. original_balance is set once,
  // on creation, and never overwritten by later edits or bank syncs -- see
  // lib/plaid.ts / app/debts/page.tsx -- so this is a real "how far have you
  // come," not just today's balance re-labeled. Debts from before this field
  // existed have original_balance = null and are left out rather than shown
  // as 0% progress.
  const progressDebts = useMemo(() => {
    return activeDebts
      .filter((d) => d.original_balance != null && Number(d.original_balance) > 0)
      .map((d) => {
        const original = Number(d.original_balance) || 0
        const current = Number(d.balance) || 0
        const paidDown = original - current
        const percent = original > 0 ? (paidDown / original) * 100 : 0
        return { id: d.id, name: d.name, original, current, paidDown, percent }
      })
  }, [activeDebts])

  const progressTotals = useMemo(() => {
    const original = progressDebts.reduce((sum, d) => sum + d.original, 0)
    const paidDown = progressDebts.reduce((sum, d) => sum + d.paidDown, 0)
    return {
      original,
      paidDown,
      percent: original > 0 ? (paidDown / original) * 100 : 0,
    }
  }, [progressDebts])

  // "If you never change anything" baseline -- minimum payments only, no
  // extra, no snowball/avalanche redirect. The Payoff Plan page is
  // deliberately interactive (you pick a strategy and an extra payment
  // there), so it never shows this fixed reference point on its own. Same
  // simulation engine as the Payoff Plan, so the numbers can't drift apart.
  const start = useMemo(() => new Date(), [])
  const minimumOnlySim = useMemo(() => {
    if (activeDebts.length === 0) return null
    const simDebts: SimDebt[] = activeDebts.map((d) => ({
      id: d.id,
      name: d.name,
      balance: Number(d.balance) || 0,
      interest_rate: Number(d.interest_rate) || 0,
      minimum_payment: Number(d.minimum_payment) || 0,
      debt_type: d.debt_type,
      escrow_payment: d.escrow_payment,
    }))
    return simulate(simDebts, "avalanche", 0, start, "balance", false)
  }, [activeDebts, start])

  const minimumOnlyLabel =
    minimumOnlySim && minimumOnlySim.months > 0 ? monthLabel(start, minimumOnlySim.months - 1) : "-"

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

  const monthlyInterestById = useMemo(() => {
    const m = new Map<string, number>()
    costRanking.forEach((c) => m.set(c.id, c.monthlyInterest))
    return m
  }, [costRanking])

  const progressById = useMemo(() => {
    const m = new Map<string, number>()
    progressDebts.forEach((p) => m.set(p.id, p.percent))
    return m
  }, [progressDebts])

  const effectivePlan = isAdmin ? "connected" : plan
  const allowed = canUseAdvancedAnalytics(effectivePlan)

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
        What your debt is actually costing you, and how far you've come.{" "}
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
          <p className="text-gray-400">Monthly Interest Cost</p>
          <p className="text-2xl font-bold truncate">{formatMoney(totalMonthlyInterest)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {totalMonthlyPayments > 0
              ? `${((totalMonthlyInterest / totalMonthlyPayments) * 100).toFixed(0)}% of every payment`
              : "of every payment"}
          </p>
        </div>

        <div className="rounded bg-gray-900 p-6 min-w-0">
          <p className="text-gray-400">Avg Interest</p>
          <p className="text-2xl font-bold truncate">{weightedAvgInterest.toFixed(2)}%</p>
          <p className="mt-1 text-xs text-gray-500">weighted by balance</p>
        </div>
      </div>

      <FinancialHealthScore debts={debts} ready={ready} />

      {/* What's really costing you -- ranked by monthly interest, not balance. */}
      <div className="mb-10 rounded bg-gray-900 p-6">
        <div className="mb-1 flex items-center gap-2">
          <Flame size={18} className="text-amber-400" />
          <h2 className="text-lg font-semibold">What's actually costing you</h2>
        </div>
        <p className="mb-4 text-sm text-gray-400">
          Ranked by interest charged per month, not by balance -- a smaller, high-rate
          debt can cost more than a bigger, cheaper one.
        </p>
        {costRanking.length > 0 ? (
          <div style={{ width: "100%", height: Math.max(160, costRanking.length * 46) }}>
            <ResponsiveContainer>
              <BarChart data={costRanking} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis
                  type="number"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickFormatter={(v) => formatMoney(Math.round(Number(v)))}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  width={110}
                />
                <Tooltip
                  formatter={(v: unknown) => [formatMoney(Number(v) || 0), "Interest / month"]}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="monthlyInterest" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center text-gray-400">
            Add debts to see what's costing you the most.
          </div>
        )}
      </div>

      {/* If you only paid minimums -- the fixed baseline the interactive
          Payoff Plan page never shows on its own. */}
      {minimumOnlySim && (
        <div className="mb-10 rounded bg-gray-900 p-6">
          <div className="mb-1 flex items-center gap-2">
            <Clock size={18} className="text-blue-400" />
            <h2 className="text-lg font-semibold">If you only ever pay the minimum</h2>
          </div>
          {minimumOnlySim.nonAmortizing ? (
            <div className="mt-3 flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-4">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-400" />
              <p className="text-sm text-red-200">
                Your current minimum payments don't even cover a month's interest --
                at this pace your balances would never go down.{" "}
                <Link href="/amortization" className="underline hover:text-red-100">
                  See what an extra payment would change &rarr;
                </Link>
              </p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-400">
                No extra payments, no snowball or avalanche -- just the minimums, on
                schedule.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded bg-gray-950/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total interest paid</p>
                  <p className="mt-1 text-xl font-bold text-red-300">
                    {formatMoney(minimumOnlySim.totalInterest)}
                  </p>
                </div>
                <div className="rounded bg-gray-950/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total paid (principal + interest)</p>
                  <p className="mt-1 text-xl font-bold">{formatMoney(minimumOnlySim.totalPaid)}</p>
                </div>
                <div className="rounded bg-gray-950/50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Debt-free</p>
                  <p className="mt-1 text-xl font-bold">
                    {minimumOnlySim.capped ? "50+ years" : minimumOnlyLabel}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-400">
                Putting even a little extra toward one debt at a time changes this a
                lot.{" "}
                <Link href="/amortization" className="text-blue-400 hover:text-blue-300">
                  Try an extra payment on your Payoff Plan &rarr;
                </Link>
              </p>
            </>
          )}
        </div>
      )}

      {/* Progress since you started -- original_balance vs today. */}
      {progressDebts.length > 0 && (
        <div className="mb-10 rounded bg-gray-900 p-6">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-400" />
            <h2 className="text-lg font-semibold">Progress since you started</h2>
          </div>
          <p className="mb-4 text-sm text-gray-400">
            {formatMoney(progressTotals.paidDown)} paid down out of{" "}
            {formatMoney(progressTotals.original)} tracked since these debts were added
            (
            {progressTotals.percent.toFixed(0)}%).
          </p>
          <div className="space-y-4">
            {progressDebts.map((p) => {
              const pct = Math.max(0, Math.min(100, p.percent))
              const grew = p.paidDown < 0
              return (
                <div key={p.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-300">{p.name}</span>
                    <span className={grew ? "text-red-300" : "text-emerald-300"}>
                      {grew
                        ? `${formatMoney(Math.abs(p.paidDown))} added (${p.percent.toFixed(0)}%)`
                        : `${formatMoney(p.paidDown)} paid down (${p.percent.toFixed(0)}%)`}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                    <div
                      className={`h-full rounded-full ${grew ? "bg-red-400" : "bg-emerald-400"}`}
                      style={{ width: `${grew ? 100 : pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {activeDebts.length > progressDebts.length && (
            <p className="mt-4 text-xs text-gray-500">
              {activeDebts.length - progressDebts.length} debt
              {activeDebts.length - progressDebts.length === 1 ? "" : "s"} added before
              this tracking existed and {activeDebts.length - progressDebts.length === 1 ? "isn't" : "aren't"} included above.
            </p>
          )}
        </div>
      )}

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
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-gray-400">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium">Balance</th>
                  <th className="pb-2 pr-4 font-medium">APR</th>
                  <th className="pb-2 pr-4 font-medium">Interest / mo</th>
                  <th className="pb-2 pr-4 font-medium">Monthly payment</th>
                  <th className="pb-2 font-medium">Paid down</th>
                </tr>
              </thead>
              <tbody>
                {debtsByBalance.map((d) => (
                  <tr key={d.id} className="border-b border-gray-800/60">
                    <td className="py-2 pr-4 font-semibold">{d.name}</td>
                    <td className="py-2 pr-4 text-gray-300">{debtTypeLabel(d.debt_type)}</td>
                    <td className="py-2 pr-4">{formatMoney(Number(d.balance) || 0)}</td>
                    <td className="py-2 pr-4">{(Number(d.interest_rate) || 0).toFixed(2)}%</td>
                    <td className="py-2 pr-4 text-amber-300">
                      {formatMoney(monthlyInterestById.get(d.id) || 0)}
                    </td>
                    <td className="py-2 pr-4">
                      {formatMoney(Number(d.minimum_payment) || 0)}
                      {Number(d.escrow_payment) > 0 && (
                        <span className="ml-1 text-xs text-gray-500">
                          (incl. {formatMoney(Number(d.escrow_payment))} escrow)
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-gray-300">
                      {progressById.has(d.id) ? `${(progressById.get(d.id) || 0).toFixed(0)}%` : "—"}
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
