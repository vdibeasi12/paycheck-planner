"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Lock } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

type Tier = "free" | "starter" | "premium" | "connected"

const RANK: Record<Tier, number> = { free: 0, starter: 1, premium: 2, connected: 3 }

type StepDef = {
  key: string
  label: string
  href: string
  rank: number
  kind: "data" | "action" | "locked"
  table?: string
  progressKey?: string
}

// Cumulative by tier: each higher tier shows the lower tiers steps plus its own.
const STEP_DEFS: StepDef[] = [
  { key: "income", label: "Add your income", href: "/income", rank: 0, kind: "data", table: "income" },
  { key: "debts", label: "Add a debt", href: "/debts", rank: 0, kind: "data", table: "debts" },
  { key: "bills", label: "Add a bill", href: "/bills", rank: 0, kind: "data", table: "bills" },
  { key: "payoff", label: "Review your payoff plan", href: "/amortization", rank: 1, kind: "action", progressKey: "payoff_reviewed" },
  { key: "ai", label: "Try AI Insights", href: "/ai-chat", rank: 2, kind: "action", progressKey: "ai_tried" },
  { key: "connect_bank", label: "Connect your bank", href: "#", rank: 3, kind: "locked" },
  { key: "auto_sync", label: "Set up automatic debt sync", href: "#", rank: 3, kind: "locked" },
]

type Step = StepDef & { done: boolean; locked: boolean }

export default function OnboardingChecklist() {
  const router = useRouter()
  const [steps, setSteps] = useState<Step[] | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (active) setSteps([])
        return
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single()

      const plan = ((prof?.plan as Tier) || "free")
      const userRank = RANK[plan] ?? 0
      const defs = STEP_DEFS.filter((d) => d.rank <= userRank)

      const { data: progRows } = await supabase
        .from("onboarding_progress")
        .select("step_key")
        .eq("user_id", user.id)
      const doneKeys = new Set((progRows || []).map((r) => r.step_key as string))

      const out = await Promise.all(
        defs.map(async (d): Promise<Step> => {
          if (d.kind === "locked") return { ...d, done: false, locked: true }
          if (d.kind === "action") return { ...d, done: doneKeys.has(d.progressKey || ""), locked: false }
          const { count } = await supabase
            .from(d.table as string)
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
          return { ...d, done: (count || 0) > 0, locked: false }
        })
      )

      if (active) setSteps(out)
    }

    load()
    return () => {
      active = false
    }
  }, [])

  if (!steps || steps.length === 0) return null

  const done = steps.filter((s) => s.done).length
  const total = steps.length
  if (done >= total) return null

  const pct = Math.round((done / total) * 100)

  const markAndGo = async (step: Step) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user && step.progressKey) {
        await supabase
          .from("onboarding_progress")
          .upsert(
            { user_id: user.id, step_key: step.progressKey },
            { onConflict: "user_id,step_key", ignoreDuplicates: true }
          )
      }
    } catch {
      // Non-blocking: navigate regardless.
    }
    router.push(step.href)
  }

  const dotClass = (s: Step) =>
    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border " +
    (s.done
      ? "border-emerald-500 bg-emerald-500 text-white"
      : s.locked
      ? "border-gray-700 text-gray-600"
      : "border-gray-600 text-transparent")

  const labelClass = (s: Step) =>
    s.done ? "text-gray-500 line-through" : s.locked ? "text-gray-500" : ""

  const rowInner = (s: Step) => (
    <>
      <span className={dotClass(s)}>
        {s.locked ? <Lock size={10} strokeWidth={2.5} /> : <Check size={11} strokeWidth={3} />}
      </span>
      <span className={labelClass(s)}>{s.label}</span>
      {s.locked ? (
        <span className="ml-auto rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
          Soon
        </span>
      ) : null}
    </>
  )

  return (
    <div className="mx-3 mt-2 rounded-xl border border-gray-800 bg-[#0f172a] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Getting started
        </span>
        <span className="text-xs text-gray-500">
          {done}/{total}
        </span>
      </div>

      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: pct + "%" }} />
      </div>

      <ul className="flex flex-col gap-1">
        {steps.map((s) => (
          <li key={s.key}>
            {s.locked ? (
              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-300">
                {rowInner(s)}
              </div>
            ) : s.kind === "action" ? (
              <button
                onClick={() => markAndGo(s)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-gray-300 transition hover:bg-white/5"
              >
                {rowInner(s)}
              </button>
            ) : (
              <Link
                href={s.href}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-300 transition hover:bg-white/5"
              >
                {rowInner(s)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}