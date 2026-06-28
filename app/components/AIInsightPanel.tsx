"use client"

import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"

type Debt = Record<string, any>

export default function AIInsightPanel({ debts }: { debts: Debt[] }) {
  const [advice, setAdvice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const hasDebts = (debts || []).length > 0

  async function generate() {
    setErr(null)
    setLoading(true)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debts }),
      })
      const data = await res.json().catch(() => ({}))
      setAdvice(
        typeof data?.advice === "string"
          ? data.advice
          : "Unable to generate advice right now."
      )
    } catch {
      setErr("Couldn't reach the AI service. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!hasDebts) {
    return (
      <p className="text-sm text-gray-400">
        Add a debt to get a personalized AI insight on your payoff strategy.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {advice ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-200">
          {advice}
        </p>
      ) : (
        <p className="text-sm text-gray-400">
          Get a personalized insight on which debt to tackle first and why.
        </p>
      )}
      {err && <p className="text-sm text-rose-400">{err}</p>}
      <button
        onClick={generate}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-green-600 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Sparkles size={16} />
        )}
        {advice ? "Regenerate insight" : "Generate insight"}
      </button>
    </div>
  )
}