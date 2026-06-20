"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import {
  CheckCircle2,
  Circle,
  CreditCard,
  Receipt,
  Target,
  X,
  LayoutDashboard,
} from "lucide-react"

const SOURCES = [
  { value: "", label: "Select an option (optional)" },
  { value: "search", label: "Search engine (Google, Bing)" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "reddit", label: "Reddit" },
  { value: "friend", label: "Friend or family" },
  { value: "blog", label: "Blog or article" },
  { value: "app_store", label: "App Store / Play Store" },
  { value: "other", label: "Other" },
]

type Props = { open: boolean; onClose: () => void }

export default function GettingStartedModal({ open, onClose }: Props) {
  const [counts, setCounts] = useState<{ debts: number; bills: number; goals: number } | null>(null)
  const [source, setSource] = useState("")
  const [busy, setBusy] = useState(false)

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Load progress whenever the popup opens.
  useEffect(() => {
    if (!open) return
    let active = true
    ;(async () => {
      setCounts(null)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (active) setCounts({ debts: 0, bills: 0, goals: 0 })
        return
      }
      const countFor = async (table: string) => {
        const { count } = await supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
        return count ?? 0
      }
      const [debts, bills, goals] = await Promise.all([
        countFor("debts"),
        countFor("bills"),
        countFor("financial_goals"),
      ])
      if (active) setCounts({ debts, bills, goals })
    })()
    return () => {
      active = false
    }
  }, [open])

  if (!open) return null

  const steps = [
    {
      done: (counts?.debts ?? 0) > 0,
      href: "/debts",
      Icon: CreditCard,
      title: "Add your first debt",
      desc: "Enter a balance, interest rate (APR), and minimum payment so we can build your payoff plan.",
    },
    {
      done: (counts?.bills ?? 0) > 0,
      href: "/bills",
      Icon: Receipt,
      title: "Add a bill or paycheck",
      desc: "Track what's coming in and going out each month.",
    },
    {
      done: (counts?.goals ?? 0) > 0,
      href: "/goals",
      Icon: Target,
      title: "Set a goal",
      desc: "Pick something to aim for and watch your progress add up.",
    },
  ]
  const completed = steps.filter((s) => s.done).length
  const pct = counts ? Math.round((completed / steps.length) * 100) : 0

  const finish = async () => {
    setBusy(true)
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: source || null }),
      })
    } catch {
      // Non-blocking.
    }
    setBusy(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Getting started"
      onClick={onClose}
    >
      <div
        className="relative my-6 w-full max-w-2xl rounded-2xl border border-gray-700 bg-[#020617] text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition hover:bg-white/10 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="px-6 py-8 sm:px-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Welcome to Paycheck Planner</h1>
          <p className="mt-2 text-gray-400">
            Let's get you set up. Three quick steps and you'll have a real payoff plan.
          </p>

          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm text-gray-400">
              <span>
                {completed} of {steps.length} done
              </span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-800">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 rounded-xl border p-5 ${
                  s.done ? "border-green-500/40 bg-green-500/5" : "border-gray-700 bg-[#0f172a]"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {s.done ? (
                    <CheckCircle2 className="text-green-400" size={24} />
                  ) : (
                    <Circle className="text-gray-500" size={24} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <s.Icon size={18} className="shrink-0 text-gray-300" />
                    <h3 className="font-semibold">{s.title}</h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-400">{s.desc}</p>
                </div>
                <Link
                  href={s.href}
                  onClick={onClose}
                  className={`shrink-0 self-center rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    s.done
                      ? "border border-gray-700 text-gray-300 hover:text-white"
                      : "bg-green-500 text-black hover:bg-green-600"
                  }`}
                >
                  {s.done ? "Edit" : "Start"}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-gray-700 bg-[#0f172a] p-5">
            <label htmlFor="gs-source" className="block text-sm font-semibold text-white">
              How did you hear about us?
            </label>
            <p className="mt-1 text-xs text-gray-400">
              Optional -- it helps us reach more people like you.
            </p>
            <select
              id="gs-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="mt-3 w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={finish}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg bg-green-500 px-5 py-2.5 font-semibold text-black transition hover:bg-green-600 disabled:bg-gray-600"
            >
              <LayoutDashboard size={18} />
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}