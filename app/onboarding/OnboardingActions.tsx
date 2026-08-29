"use client"

import { useState } from "react"
import { LayoutDashboard, Gift, Sparkles } from "lucide-react"
import ReferralCard from "@/app/components/ReferralCard"

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

export default function OnboardingActions({ allDone }: { allDone: boolean }) {
  const [busy, setBusy] = useState(false)
  const [source, setSource] = useState("")
  // Surface the referral program + lead magnet right at the moment
  // onboarding finishes (Aug 29 2026) -- ReferralCard already existed and
  // was already on the dashboard, but by then it's competing with debts,
  // charts, and everything else on the page. This is the one moment
  // someone is guaranteed to be paying full attention and hasn't been
  // asked for anything yet, so it gets its own screen instead of an
  // immediate redirect.
  const [done, setDone] = useState(false)

  const finish = async () => {
    setBusy(true)
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: source || null }),
      })
    } catch {
      // Non-blocking: still show the success screen below.
    }
    setBusy(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="mt-8 space-y-6">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
          <p className="text-lg font-semibold text-white">You're all set!</p>
          <p className="mt-1 text-sm text-gray-300">
            Your plan is ready. Two quick things before you go in --
          </p>
        </div>

        <ReferralCard />

        <a
          href="/money-score"
          className="flex items-start gap-3 rounded-xl border border-gray-700 bg-[#0f172a] p-4 transition hover:border-emerald-400/60"
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

        <div className="flex items-center justify-end">
          <a
            href="/dashboard"
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-black font-semibold px-5 py-2.5 rounded-lg transition"
          >
            <LayoutDashboard size={18} />
            Go to my dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <div className="rounded-xl border border-gray-700 bg-[#0f172a] p-5">
        <label htmlFor="signup-source" className="block text-sm font-semibold text-white">
          How did you hear about us?
        </label>
        <p className="mt-1 text-xs text-gray-400">
          Optional -- it helps us reach more people like you.
        </p>
        <select
          id="signup-source"
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

      <div className="mt-6 flex items-center justify-end">
        <button
          onClick={finish}
          disabled={busy}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-semibold px-5 py-2.5 rounded-lg transition"
        >
          <Gift size={18} />
          {allDone ? "Finish" : "Finish & continue"}
        </button>
      </div>
    </div>
  )
}
