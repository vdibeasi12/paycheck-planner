"use client"

// app/components/DataLoadError.tsx
//
// Shown in place of the money on any page where a financial query failed --
// see lib/dataLoad.ts for why showing nothing beats showing a number here.
//
// Deliberately explicit about WHICH data is missing and about the fact that
// no figure is being shown, rather than a generic "something went wrong."
// Someone who opens Safe to Spend is about to decide whether to spend money;
// they need to know they are not looking at an answer.

import { AlertTriangle, RefreshCw } from "lucide-react"

export default function DataLoadError({
  missing,
  explanation,
}: {
  missing: string[]
  // Override the default body copy. The default is specific to the money
  // pages ("this would look like more money than you have"); a page that
  // fails differently -- the payoff schedule, say -- should explain its own
  // failure rather than reuse a sentence that is not true there.
  explanation?: string
}) {
  const list =
    missing.length === 1
      ? missing[0]
      : missing.length === 2
        ? `${missing[0]} and ${missing[1]}`
        : `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="shrink-0 text-amber-400" />
        <h2 className="text-base font-semibold text-primary">We couldn&apos;t load your {list}</h2>
      </div>

      <p className="mt-2 max-w-xl text-sm text-secondary">
        {explanation ?? (
          <>
            Your numbers aren&apos;t shown because they would be wrong. Safe to Spend is what you have minus what
            you owe, so if we can&apos;t read your {list}, anything we displayed would look like more money than
            you actually have.
          </>
        )}
      </p>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Nothing in your account has changed. This is almost always temporary.
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-emerald-600"
      >
        <RefreshCw size={15} /> Try again
      </button>
    </div>
  )
}
