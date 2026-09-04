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
  RefreshCw,
  Shield,
  Wand2,
  Bell,
  X,
  LayoutDashboard,
  Sparkles,
} from "lucide-react"
import ReferralCard from "@/app/components/ReferralCard"

type Tier = "free" | "starter" | "premium" | "connected"
const RANK: Record<Tier, number> = { free: 0, starter: 1, premium: 2, connected: 3 }
const TIER_LABEL: Record<number, string> = { 1: "Momentum", 2: "Accelerate", 3: "Autopilot" }

type StepDef = {
  key: string
  rank: number
  kind: "data" | "action" | "locked" | "mfa" | "plaid"
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
    key: "debts", rank: 0, kind: "data", href: "/bills-debts", Icon: CreditCard, table: "debts",
    title: "Add your first debt",
    desc: "Enter a balance, interest rate (APR), and minimum payment so we can build your payoff plan.",
  },
  {
    key: "bills", rank: 0, kind: "data", href: "/bills-debts", Icon: Receipt, table: "bills",
    title: "Add a bill",
    desc: "Track what's coming in and going out each month.",
  },
  {
    key: "mfa", rank: 0, kind: "mfa", href: "/mfa/setup", Icon: Shield,
    title: "Secure your account (2FA)",
    desc: "Add a one-time code at sign-in -- authenticator app or email, your choice.",
  },
  {
    key: "notifications", rank: 0, kind: "action", href: "/account", Icon: Bell, progressKey: "notifications_reviewed",
    title: "Review your notification preferences",
    desc: "Choose what you want to hear about -- bill reminders, new Financial Hub posts, and more.",
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
    key: "connect_bank", rank: 3, kind: "plaid", href: "/account", Icon: CreditCard,
    title: "Connect your credit card - Autopilot",
    desc: "Securely link an institution so balances and APRs update on their own. Let balances refresh automatically so your plan stays accurate without manual entry.",
  },
  {
    key: "autopilot", rank: 3, kind: "action", href: "/paycheck-autopilot", Icon: Wand2, progressKey: "autopilot_reviewed",
    title: "Preview Plan Autopilot",
    desc: "A few days before payday, see your next paycheck plan drafted automatically -- bills, debt, and goals already broken out.",
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

type Props = {
  open: boolean
  onClose: () => void
  // True only for the auto-opened, still-onboarding first run (see
  // Sidebar.tsx) -- trims the checklist down to just the two steps that
  // actually matter before someone has entered a single number, and shows
  // the referral/lead-magnet success screen on completion. A later reopen
  // from the nav ("Getting Started" button) passes false and gets the full
  // checklist with a plain close, same as before.
  firstRun?: boolean
}

// Real onboarding is 2 things away from useful, not 9 (QA fix, Aug 29
// 2026): live user data showed nobody who saw the full 9-item checklist on
// first open ever finished it -- one person peeked at /income for under a
// minute and bounced, another never touched a single step. Trimming the
// first open to income + first debt (the two the entire payoff plan is
// built from) is the actual fix; everything else (bills, 2FA, notification
// prefs, and the paid-tier previews) is still here on every later reopen.
const FIRST_RUN_KEYS = new Set(["income", "debts"])

export default function GettingStartedModal({ open, onClose, firstRun = false }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [source, setSource] = useState("")
  const [busy, setBusy] = useState(false)
  // Post-finish success screen (referral link + lead magnet) -- only shown
  // for the trimmed first-run checklist, which is the moment that used to
  // be app/onboarding/OnboardingActions.tsx's job. That page turned out to
  // be orphaned: nothing in the live signup flow ever routes a user there,
  // so nobody ever saw the referral card or lead-magnet mention added to it
  // (Aug 29 2026). This modal is the real "just finished setup" moment.
  const [done, setDone] = useState(false)

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
      setDone(false)
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
      // First run: just income + debts. Every other open (nav-triggered, or
      // a first run that already finished): every step, with ones above the
      // user's tier rendering as locked upgrade previews.
      const defs = firstRun ? STEP_DEFS.filter((d) => FIRST_RUN_KEYS.has(d.key)) : STEP_DEFS

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
          if (d.kind === "mfa") {
            const { data: factors } = await supabase.auth.mfa.listFactors()
            const hasVerified =
              !!factors &&
              Array.isArray(factors.all) &&
              factors.all.some((f) => f.status === "verified")
            return { ...d, done: hasVerified, locked: false, upgrade: false }
          }
          if (d.kind === "action") return { ...d, done: doneKeys.has(d.progressKey || ""), locked: false, upgrade: false }
          if (d.kind === "plaid") {
            // QA fix (Sep 4 2026, Vince): plaid_items has RLS enabled with NO
            // policy granting the signed-in user's own client any access at
            // all (every other plaid_items read in this app goes through a
            // service-role client for exactly this reason -- see
            // app/api/plaid/items/route.ts). The old generic "count this
            // table" check below silently always returned 0 rows here, so
            // this step could never check off no matter how many banks were
            // actually connected. Going through the same /api/plaid/items
            // route the Connected Accounts UI already uses fixes it without
            // loosening plaid_items' RLS (which would otherwise let a client
            // query for access_token directly).
            try {
              const res = await fetch("/api/plaid/items")
              const json = await res.json().catch(() => ({}))
              const items = Array.isArray(json?.items) ? json.items : []
              return { ...d, done: items.length > 0, locked: false, upgrade: false }
            } catch {
              return { ...d, done: false, locked: false, upgrade: false }
            }
          }
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
  }, [open, firstRun])

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
    if (firstRun) {
      setDone(true)
    } else {
      onClose()
    }
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
        {done ? (
          <div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
              <p className="text-lg font-semibold text-white">You're all set!</p>
              <p className="mt-1 text-sm text-gray-300">
                Your plan is ready. Two quick things before you go in --
              </p>
            </div>

            <div className="mt-6">
              <ReferralCard />
            </div>

            <a
              href="/money-score"
              onClick={onClose}
              className="mt-6 flex items-start gap-3 rounded-xl border border-gray-700 bg-[#0f172a] p-4 transition hover:border-emerald-400/60"
            >
              <Sparkles size={20} className="mt-0.5 shrink-0 text-emerald-400" />
              <span>
                <span className="block text-sm font-semibold text-white">
                  Not sure where to start? Take the free Money Score quiz
                </span>
                <span className="mt-1 block text-xs text-gray-400">
                  A 2-minute check-in that scores your finances and hands you a plan to improve them.
                </span>
              </span>
            </a>

            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="flex items-center gap-2 rounded-lg bg-green-500 px-5 py-2.5 font-semibold text-black transition hover:bg-green-600"
              >
                <LayoutDashboard size={18} />
                Go to my dashboard
              </button>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
        </div>
      </div>
    </div>
  )
}