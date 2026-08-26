"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PiggyBank } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import { SURPLUS_DECISIONS, type SurplusDecision } from "@/lib/paycheckSurplus"

type DebtOption = { id: string; name: string }
type GoalOption = { id: string; title: string }

type Props = {
  decisionId: string
  cycleDate: string
  surplusAmount: number
  debts: DebtOption[]
  goals: GoalOption[]
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/**
 * "Paycheck Surplus" -- shown when lib/paycheckSurplus.ts's
 * detectClosedCycleSurplus finds a closed cycle with money still left in it
 * (per the existing Safe-to-Spend math, not a live balance). Debt and goal
 * are the only two choices that touch a real record; the other three are
 * just recorded for the user's own tracking, and say so.
 */
export default function PaycheckSurplusPrompt({ decisionId, cycleDate, surplusAmount, debts, goals }: Props) {
  const formatMoney = useFormatCurrency()
  const router = useRouter()
  const [picked, setPicked] = useState<SurplusDecision | null>(null)
  const [targetId, setTargetId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (done) return null

  const activeOption = SURPLUS_DECISIONS.find((d) => d.id === picked) || null
  const needsTarget = !!activeOption?.needsTarget
  const targetOptions = picked === "debt" ? debts : picked === "goal" ? goals : []

  async function submit() {
    if (!picked) return
    if (needsTarget && !targetId) {
      setError(picked === "debt" ? "Choose a debt first." : "Choose a goal first.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/paycheck-surplus/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisionId,
          decision: picked,
          targetDebtId: picked === "debt" ? targetId : undefined,
          targetGoalId: picked === "goal" ? targetId : undefined,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError((data && data.error) || "Something went wrong -- try again.")
        return
      }
      setDone(true)
      router.refresh()
    } catch {
      setError("Something went wrong -- try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-6 shadow-lg">
      <div className="flex items-center gap-2">
        <PiggyBank size={18} className="text-emerald-400" />
        <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">Paycheck surplus</h2>
      </div>
      <p className="mt-2 text-white">
        Your {formatDate(cycleDate)} paycheck still had{" "}
        <span className="font-semibold text-emerald-400">{formatMoney(surplusAmount)}</span> left over. What should
        happen to it?
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {SURPLUS_DECISIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              setPicked(opt.id)
              setTargetId("")
              setError(null)
            }}
            className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
              picked === opt.id
                ? "border-emerald-500 bg-emerald-500/10 text-white"
                : "border-gray-700 bg-white/[0.02] text-gray-300 hover:bg-white/5"
            }`}
          >
            <p className="font-medium">{opt.label}</p>
            <p className="mt-0.5 text-xs text-gray-500">{opt.description}</p>
          </button>
        ))}
      </div>

      {needsTarget && (
        <div className="mt-4">
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            aria-label={picked === "debt" ? "Choose a debt" : "Choose a goal"}
            className="w-full rounded-lg border border-gray-700 bg-[#0f172a] px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">{picked === "debt" ? "Choose a debt..." : "Choose a goal..."}</option>
            {targetOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {"name" in opt ? opt.name : opt.title}
              </option>
            ))}
          </select>
          {targetOptions.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              {picked === "debt" ? "Add a debt first to pick one here." : "Add a goal first to pick one here."}
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {picked && (
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-4 rounded-lg bg-emerald-500 px-5 py-2 font-semibold text-black disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Confirm"}
        </button>
      )}
    </div>
  )
}
