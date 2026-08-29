"use client"

import { useState } from "react"
import { LayoutDashboard } from "lucide-react"

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

  const finish = async () => {
    setBusy(true)
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: source || null }),
      })
    } catch {
      // Non-blocking: still send them to the dashboard.
    }
    window.location.href = "/dashboard"
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
          <LayoutDashboard size={18} />
          {allDone ? "Go to my dashboard" : "Finish & go to dashboard"}
        </button>
      </div>
    </div>
  )
}