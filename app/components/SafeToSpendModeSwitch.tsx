"use client"

// app/components/SafeToSpendModeSwitch.tsx
//
// Sep 11 2026, Vince: "We need to create a detailed version and a simplified
// version for /safe-to-spend with a toggle."
//
// Both views are rendered on the server and handed in as props, so switching
// is instant and neither view recomputes anything -- they are two
// presentations of one set of already-agreed numbers, which is the only way
// this page stays trustworthy.
//
// Simple is the DEFAULT. Vince's point was that most people open this page to
// answer "can I buy this" and get a wall of reasoning instead. Anyone who
// wants the reasoning is one click away and their choice is remembered.

import { useEffect, useState } from "react"
import { LayoutList, Gauge } from "lucide-react"

const STORAGE_KEY = "pp:safe-to-spend-view"
type Mode = "simple" | "detailed"

export default function SafeToSpendModeSwitch({
  simple,
  detailed,
}: {
  simple: React.ReactNode
  detailed: React.ReactNode
}) {
  // Always render Simple first, then adopt the stored preference after mount.
  // Reading localStorage during render would make the server and client
  // markup disagree and React would throw away the tree.
  const [mode, setMode] = useState<Mode>("simple")

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved === "detailed" || saved === "simple") setMode(saved)
    } catch {
      // Private browsing or blocked site data -- Simple is a fine default.
    }
  }, [])

  function choose(next: Mode) {
    setMode(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Preference just won't persist; the page still works.
    }
  }

  return (
    <div className="space-y-5">
      <div
        className="inline-flex rounded-xl border border-default bg-surface p-1"
        role="group"
        aria-label="Safe to Spend detail level"
      >
        <button
          type="button"
          onClick={() => choose("simple")}
          aria-pressed={mode === "simple"}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            mode === "simple" ? "bg-emerald-500 text-black" : "text-secondary hover:text-primary"
          }`}
        >
          <Gauge size={15} /> Simple
        </button>
        <button
          type="button"
          onClick={() => choose("detailed")}
          aria-pressed={mode === "detailed"}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            mode === "detailed" ? "bg-emerald-500 text-black" : "text-secondary hover:text-primary"
          }`}
        >
          <LayoutList size={15} /> Detailed
        </button>
      </div>

      {mode === "simple" ? simple : detailed}

      {mode === "simple" && (
        <p className="text-xs text-muted">
          Showing just the number you can act on. Switch to Detailed for the full schedule behind it.
        </p>
      )}
    </div>
  )
}
