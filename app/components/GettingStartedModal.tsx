"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import {
  CheckCircle2,
  Circle,
  Wallet,
  CreditCard,
  Receipt,
  CalendarClock,
  MessageSquare,
  Landmark,
  RefreshCw,
  X,
  LayoutDashboard,
} from "lucide-react"

type Tier = "free" | "starter" | "premium" | "connected"
const RANK: Record<Tier, number> = { free: 0, starter: 1, premium: 2, connected: 3 }
const TIER_LABEL: Record<number, string> = { 1: "Momentum", 2: "Accelerate", 3: "Autopilot" }

type StepDef = {
  key: string
  rank: number
  kind: "data" | "action" | "locked"
  href: string
  Icon: any
  title: string
  desc: string
  table?: string
  progressKey?: string
}

// Cumulative by tier: each higher tier shows every lower-tier step plus its own.
const STEP_DEFS: StepDef[] = [
  {
    key: "income", rank: 0, kind: "data", href: "/income", Icon: Wallet, table: "income",
    title: "Add your income",
    desc: "Enter each paycheck and how often it arrives so the budget math is right.",
  },
  {
    key: "debts", rank: 0, kind: "data", href: "/debts", Icon: CreditCard, table: "debts",
    title: "Add your first debt",
    desc: "Enter a balance, interest rate (APR), and minimum payment so we can build your payoff plan.",
  },
  {
    key: "bills", rank: 0, kind: "data", href: "/bills", Icon: Receipt, table: "bills",
    title: "Add a bill",
    desc: "Track what's coming in and going out each month.",
  },
  {
    key: "payoff", rank: 1, kind: "action", href: "/amortization", Icon: CalendarClock, progressKey: "payoff_reviewed",
    title: "Review your payoff plan",
    desc: "See your debt-free date and the order we'll knock out each balance.",
  },
  {
    key: "ai", rank: 2, kind: "action", href: "/ai-chat", Icon: MessageSquare, progressKey: "ai_tried",
    title: "Try AI Insights",
    desc: "Ask a question in plain English and get answers tied to your numbers.",
  },
  {
    key: "connect_bank", rank: 3, kind: "data", href: "/account", Icon: Landmark, table: "plaid_items",
    title: "Connect your bank",
    desc: "Securely link an institution so balances and APRs update on their own.",
  },
  {
    key: "auto_sync", rank: 3, kind: "data", href: "/account", Icon: RefreshCw, table: "plaid_liabilities",
    title: "Set up automatic debt sync",
    desc: "Let balances refresh automatically so your plan stays accurate without manual entry.",
  },
]

type Step = StepDef & { done: boolean; locked: boolean; upgrade: boolean }

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
  const router = useRouter()
  const pathname = usePathname()
  const [steps, setSteps] = useState<Step[] | null>(null)
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

  // Build the tier-aware checklist whenever the popup opens.
  useEffect(() => {
    if (!open) return
    let active = true
    ;(async () => {
      setSteps(null)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (active) setSteps([])
        return
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("plan, is_admin")
        .eq("id", user.id)
        .single()

      const plan = ((prof?.plan as Tier) || "free")
      // Admins (and the connected tier) see every feature.
      const userRank = prof?.is_admin ? RANK.connected : (RANK[plan] ?? 0)
      // Show every step; ones above the user's tier render as locked upgrade previews.
      const defs = STEP_DEFS

      const { data: progRows } = await supabase
        .from("onboarding_progress")
        .select("step_key")
        .eq("user_id", user.id)
      const doneKeys = new Set((progRows || []).map((r) => r.step_key as string))

      const out = await Promise.all(
        defs.map(async (d): Promise<Step> => {
          const aboveTier = d.rank > userRank
          // Not-yet-available features ("locked") show "Soon"; features above the
          // user's tier show an upgrade preview. Both are non-actionable.
          if (d.kind === "locked") return { ...d, done: false, locked: true, upgrade: false }
          if (aboveTier) return { ...d, done: false, locked: true, upgrade: true }
          if (d.kind === "action") return { ...d, done: doneKeys.has(d.progressKey || ""), locked: false, upgrade: false }
          const { count } = await supabase
            .from(d.table as string)
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
          return { ...d, done: (count || 0) > 0, locked: false, upgrade: false }
        })
      )

      if (active) setSteps(out)
    })()
    return () => {
      active = false
    }
  }, [open])

  if (!open) return null

  const actionable = (steps || []).filter((s) => !s.locked)
  const completed = actionable.filter((s) => s.done).length
  const total = actionable.length
  const pct = total ? Math.round((completed / total) * 100) : 0

  const go = async (s: Step) => {
    if (s.locked) return
    if (s.kind === "action" && s.progressKey) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from("onboarding_progress")
            .upsert(
              { user_id: user.id, step_key: s.progressKey },
              { onConflict: "user_id,step_key", ignoreDuplicates: true }
            )
        }
      } catch {
        // Non-blocking: navigate regardless.
      }
    }
    onClose()
    router.push(s.href)
  }

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
            Let's get you set up. Here's everything your plan unlocks.
          </p>

          <button
            onClick={() => {
              onClose()
              if (pathname === "/dashboard") {
                setTimeout(() => window.dispatchEvent(new Event("pp:start-tour")), 120)
              } else {
                router.push("/dashboard?tour=1")
              }
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-200 transition hover:bg-white/5"
          >
            Take a quick tour
          </button>

          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm text-gray-400">
              <span>
                {completed} of {total} done
              </span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-800">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {steps === null ? (
              <p className="text-sm text-gray-500">Loading your checklist...</p>
            ) : (
              steps.map((s) => (
                <div
                  key={s.key}
                  className={`flex items-start gap-4 rounded-xl border p-5 ${
                    s.done
                      ? "border-green-500/40 bg-green-500/5"
                      : s.locked
                      ? "border-gray-800 bg-[#0b1220] opacity-80"
                      : "border-gray-700 bg-[#0f172a]"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {s.done ? (
                      <CheckCircle2 className="text-green-400" size={24} />
                    ) : (
                      <Circle className={s.locked ? "text-gray-600" : "text-gray-500"} size={24} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <s.Icon size={18} className="shrink-0 text-gray-300" />
                      <h3 className="font-semibold">{s.title}</h3>
                      {s.upgrade && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-400">
                          {TIER_LABEL[s.rank]}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-400">{s.desc}</p>
                  </div>
                  {s.upgrade ? (
                    <button
                      onClick={() => {
                        onClose()
                        router.push("/pricing")
                      }}
                      className="shrink-0 self-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
                    >
                      Upgrade
                    </button>
                  ) : s.locked ? (
                    <span className="shrink-0 self-center rounded-full bg-gray-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Soon
                    </span>
                  ) : (
                    <button
                      onClick={() => go(s)}
                      className={`shrink-0 self-center rounded-lg px-4 py-2 text-sm font-semibold transition ${
                        s.done
                          ? "border border-gray-700 text-gray-300 hover:text-white"
                          : "bg-green-500 text-black hover:bg-green-600"
                      }`}
                    >
                      {s.done ? "Open" : "Start"}
                    </button>
                  )}
                </div>
              ))
            )}
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