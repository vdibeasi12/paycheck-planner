"use client"

import { useEffect, useState } from "react"
import { Lock, Check, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { BADGES } from "@/lib/achievements"
import { celebrate } from "@/lib/confetti"
import BadgeIcon from "@/components/badgeIcon"

type EarnedRow = { badge_key: string; earned_at: string | null }

export default function AchievementsPage() {
  const [earned, setEarned] = useState<Record<string, string | null> | null>(null)

  useEffect(() => {
    let active = true

    const run = async () => {
      try {
        const res = await fetch("/api/achievements/check", { method: "POST" })
        const json = await res.json().catch(() => ({}))
        if (Array.isArray(json?.newlyEarned) && json.newlyEarned.length > 0) celebrate()
      } catch {
        // ignore
      }

      const { data } = await supabase
        .from("achievements")
        .select("badge_key, earned_at")

      const map: Record<string, string | null> = {}
      ;(data || []).forEach((r: EarnedRow) => {
        map[r.badge_key] = r.earned_at
      })
      if (active) setEarned(map)
    }

    run()
    return () => {
      active = false
    }
  }, [])

  const trackable = BADGES.filter((b) => b.trackable)
  const earnedCount = earned ? trackable.filter((b) => b.key in earned).length : 0

  return (
    <div className="min-h-screen bg-[#020617] p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-white">Achievements</h1>
        <p className="mt-1 text-sm text-gray-400">
          Earn badges as you take control of your money.
          {earned ? " " + earnedCount + " of " + trackable.length + " unlocked." : ""}
        </p>

        {!earned ? (
          <div className="mt-10 flex items-center gap-2 text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Loading your badges...
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BADGES.map((b) => {
              const isEarned = b.key in earned
              const comingSoon = !b.trackable && !isEarned
              const cardClass =
                "rounded-2xl border p-4 transition " +
                (isEarned
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : comingSoon
                  ? "border-gray-800 bg-[#0b1322] opacity-60"
                  : "border-gray-800 bg-[#0f172a]")
              const ringClass =
                "flex h-11 w-11 items-center justify-center rounded-full " +
                (isEarned ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-800 text-gray-500")
              return (
                <div key={b.key} className={cardClass}>
                  <div className="flex items-center justify-between">
                    <span className={ringClass}>
                      <BadgeIcon name={b.icon} size={20} />
                    </span>
                    {isEarned ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                        <Check size={12} strokeWidth={3} /> Earned
                      </span>
                    ) : comingSoon ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        Coming soon
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                        <Lock size={11} /> Locked
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-sm font-semibold text-white">{b.title}</div>
                  <div className="mt-1 text-xs text-gray-400">{b.description}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}