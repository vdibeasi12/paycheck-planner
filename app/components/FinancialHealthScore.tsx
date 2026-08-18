"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { HeartPulse, PartyPopper } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { monthlyFactor } from "@/lib/monthlyFactor"
import { popMilestone } from "@/lib/confetti"
import {
  computeFinancialHealthScore,
  diffFinancialHealth,
  type FinancialHealthResult,
  type FinancialHealthDelta,
} from "@/lib/financialHealthScore"

type Debt = {
  id: string
  balance: number
  original_balance?: number | null
  interest_rate: number
  minimum_payment: number
}

type ProfileSnapshot = {
  financial_health_score: number | null
  financial_health_dti: number | null
  financial_health_avg_apr: number | null
  financial_health_progress_pct: number | null
}

function bandColor(score: number): string {
  if (score >= 75) return "#34d399" // emerald
  if (score >= 50) return "#f59e0b" // amber
  return "#f87171" // red
}

function bandLabel(score: number): string {
  if (score >= 75) return "Strong"
  if (score >= 50) return "Building"
  return "Needs attention"
}

export default function FinancialHealthScore({ debts, ready }: { debts: Debt[]; ready: boolean }) {
  const [result, setResult] = useState<FinancialHealthResult | null>(null)
  const [previousScore, setPreviousScore] = useState<number | null>(null)
  const [delta, setDelta] = useState<FinancialHealthDelta | null>(null)
  const [displayScore, setDisplayScore] = useState<number>(0)
  const [showToast, setShowToast] = useState(false)
  const [hasDebts, setHasDebts] = useState<boolean | null>(null)
  const ranOnce = useRef(false)

  useEffect(() => {
    if (!ready || ranOnce.current) return
    ranOnce.current = true
    void run()

    async function run() {
      setHasDebts(debts.length > 0)

      const { data: userAuth } = await supabase.auth.getUser()
      if (!userAuth.user) return

      const { data: incomeData } = await supabase
        .from("income")
        .select("amount, frequency, income_type")
        .eq("user_id", userAuth.user.id)
      const income = Array.isArray(incomeData) ? incomeData : []
      const monthlyIncome = income
        .filter((i) => i.income_type !== "transfer")
        .reduce((sum, i) => sum + (Number(i.amount) || 0) * monthlyFactor(i.frequency), 0)

      const monthlyDebtPayments = debts
        .filter((d) => (Number(d.balance) || 0) > 0)
        .reduce((sum, d) => sum + (Number(d.minimum_payment) || 0), 0)

      const current = computeFinancialHealthScore({
        debts,
        monthlyDebtPayments,
        monthlyIncome: monthlyIncome > 0 ? monthlyIncome : null,
      })

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "financial_health_score, financial_health_dti, financial_health_avg_apr, financial_health_progress_pct"
        )
        .eq("id", userAuth.user.id)
        .maybeSingle<ProfileSnapshot>()

      const snapshot = {
        score: profile?.financial_health_score ?? null,
        dti: profile?.financial_health_dti ?? null,
        avgApr: profile?.financial_health_avg_apr ?? null,
        progressPct: profile?.financial_health_progress_pct ?? null,
      }
      const diff = diffFinancialHealth(current, snapshot)

      setResult(current)
      setPreviousScore(snapshot.score)
      setDelta(diff)

      // Persist this visit's numbers as the new baseline for next time.
      // Best-effort -- a failed write here just means the next visit
      // doesn't have a delta to show, not a broken page.
      try {
        await supabase
          .from("profiles")
          .update({
            financial_health_score: current.score,
            financial_health_score_updated_at: new Date().toISOString(),
            financial_health_dti: current.dti.available ? current.dti.value : null,
            financial_health_avg_apr: current.apr.available ? current.apr.value : null,
            financial_health_progress_pct: current.progress.available ? current.progress.value : null,
          })
          .eq("id", userAuth.user.id)
      } catch {
        // best-effort only
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, debts])

  // Animate the count-up/down from whatever it was last time to the new
  // score -- 68 -> 69 -> 70 -> 71 -> 72, not an instant jump. Capped at ~30
  // steps so a big first-time jump (e.g. 0 -> 80) still finishes quickly.
  useEffect(() => {
    if (!result) return
    const start = previousScore ?? 0
    const end = result.score
    if (start === end) {
      setDisplayScore(end)
      return
    }
    const steps = Math.min(Math.abs(end - start), 30) || 1
    const stepTime = 900 / steps
    let count = 0
    let current = start
    const increment = (end - start) / steps
    const id = setInterval(() => {
      count++
      current += increment
      if (count >= steps) {
        setDisplayScore(end)
        clearInterval(id)
      } else {
        setDisplayScore(Math.round(current))
      }
    }, stepTime)
    return () => clearInterval(id)
  }, [result, previousScore])

  // Celebrate only once the count-up has had time to land, and only when
  // there's a real prior score to compare against and it went up.
  useEffect(() => {
    if (!delta || !delta.hasPrevious || !delta.improved) return
    const t = setTimeout(() => {
      setShowToast(true)
      popMilestone()
    }, 950)
    const hide = setTimeout(() => setShowToast(false), 6000)
    return () => {
      clearTimeout(t)
      clearTimeout(hide)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delta])

  const color = useMemo(() => bandColor(result?.score ?? 0), [result])

  if (hasDebts === false) {
    return (
      <div className="mb-10 rounded bg-gray-900 p-6">
        <div className="mb-1 flex items-center gap-2">
          <HeartPulse size={18} className="text-emerald-400" />
          <h2 className="text-lg font-semibold">Financial Health Score</h2>
        </div>
        <p className="text-sm text-gray-400">
          Add a debt (and your income, for the fullest picture) to get your Financial
          Health Score.
        </p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="mb-10 rounded bg-gray-900 p-6">
        <div className="mb-1 flex items-center gap-2">
          <HeartPulse size={18} className="text-emerald-400" />
          <h2 className="text-lg font-semibold">Financial Health Score</h2>
        </div>
        <p className="text-sm text-gray-500">Calculating...</p>
      </div>
    )
  }

  return (
    <div className="mb-10 rounded bg-gray-900 p-6">
      <div className="mb-1 flex items-center gap-2">
        <HeartPulse size={18} className="text-emerald-400" />
        <h2 className="text-lg font-semibold">Financial Health Score</h2>
      </div>
      <p className="mb-6 text-sm text-gray-400">
        {result.debtFree
          ? "You're debt-free -- the best this score can look."
          : "A live blend of your debt-to-income ratio, interest rates, and payoff progress. Updates every time you visit."}
      </p>

      <div className="flex flex-col items-center">
        <div
          className="mb-3 flex h-36 w-36 items-center justify-center rounded-full border-8 transition-colors duration-500"
          style={{ borderColor: color }}
        >
          <span className="text-5xl font-bold text-white">{displayScore}</span>
        </div>
        <p className="text-sm font-semibold" style={{ color }}>
          {bandLabel(result.score)}
        </p>

        <div
          className={
            "mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-center transition-opacity duration-500 " +
            (showToast ? "opacity-100" : "pointer-events-none opacity-0")
          }
        >
          <PartyPopper size={18} className="shrink-0 text-emerald-300" />
          <div className="text-left">
            <p className="text-sm font-semibold text-emerald-200">
              Financial Health Improved! +{delta?.scoreDelta} point{delta?.scoreDelta === 1 ? "" : "s"}
            </p>
            {delta?.reason && <p className="text-xs text-emerald-300/80">{delta.reason}</p>}
          </div>
        </div>

        {delta?.hasPrevious && !delta.improved && delta.scoreDelta !== 0 && !showToast && (
          <p className="mt-4 text-xs text-gray-500">
            {delta.scoreDelta} point{Math.abs(delta.scoreDelta) === 1 ? "" : "s"} since your last visit
          </p>
        )}
      </div>

      {!result.debtFree && (
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-gray-800 pt-5 sm:grid-cols-3">
          <ScoreFactor
            label="Debt-to-income"
            available={result.dti.available}
            display={result.dti.available ? `${((result.dti.value as number) * 100).toFixed(0)}%` : "Add income"}
            subscore={result.dti.subscore}
          />
          <ScoreFactor
            label="Interest rate"
            available={result.apr.available}
            display={result.apr.available ? `${(result.apr.value as number).toFixed(1)}%` : "--"}
            subscore={result.apr.subscore}
          />
          <ScoreFactor
            label="Paid down"
            available={result.progress.available}
            display={result.progress.available ? `${(result.progress.value as number).toFixed(0)}%` : "No history yet"}
            subscore={result.progress.subscore}
          />
        </div>
      )}
    </div>
  )
}

function ScoreFactor({
  label,
  available,
  display,
  subscore,
}: {
  label: string
  available: boolean
  display: string
  subscore: number
}) {
  return (
    <div className="rounded bg-gray-950/50 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{display}</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full"
          style={{
            width: `${available ? subscore : 0}%`,
            backgroundColor: bandColor(subscore),
          }}
        />
      </div>
    </div>
  )
}
