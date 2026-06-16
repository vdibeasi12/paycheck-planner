"use client"

import { useState } from "react"
import { LayoutDashboard } from "lucide-react"

export default function OnboardingActions({ allDone }: { allDone: boolean }) {
  const [busy, setBusy] = useState(false)

  const finish = async () => {
    setBusy(true)
    try {
      await fetch("/api/onboarding/complete", { method: "POST" })
    } catch {
      // Non-blocking: still send them to the dashboard.
    }
    window.location.href = "/dashboard"
  }

  return (
    <div className="mt-8 flex items-center justify-between">
      <button
        onClick={finish}
        disabled={busy}
        className="text-sm text-gray-400 hover:text-white transition disabled:opacity-50"
      >
        Skip for now
      </button>
      <button
        onClick={finish}
        disabled={busy}
        className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-semibold px-5 py-2.5 rounded-lg transition"
      >
        <LayoutDashboard size={18} />
        {allDone ? "Go to my dashboard" : "Finish & go to dashboard"}
      </button>
    </div>
  )
}
