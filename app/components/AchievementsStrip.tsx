"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Trophy, ChevronRight, Lock } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { BADGES, type Badge } from "@/lib/achievements"
import { celebrate } from "@/lib/confetti"
import BadgeIcon from "@/components/badgeIcon"

const TRACKABLE = BADGES.filter((b) => b.trackable)
const byKey = (k: string): Badge | undefined => BADGES.find((b) => b.key === k)

export default function AchievementsStrip() {
  const [earnedKeys, setEarnedKeys] = useState<string[] | null>(null)

  useEffect(() => {
    let active = true

    const run = async () => {
      // Recompute + award server-side; celebrate anything newly earned.
      try {
        const res = await fetch("/api/achievements/check", { method: "POST" })
        const json = await res.json().catch(() => ({}))
        if (Array.isArray(json?.newlyEarned) && json.newlyEarned.length > 0) celebrate()
      } catch {
        // ignore: the read below still drives the display
      }

      const { data } = await supabase
        .from("achievements")
        .select("badge_key, earned_at")
        .order("earned_at", { ascending: false })

      if (active) setEarnedKeys((data || []).map((r) => r.badge_key as string))
    }

    run()
    return () => {
      active = false
    }
  }, [])

  if (!earnedKeys) return null

  const earnedSet = new Set(earnedKeys)
  const earnedCount = TRACKABLE.filter((b) => earnedSet.has(b.key)).length
  const total = TRACKABLE.length
  const latest = (earnedKeys.map(byKey).filter(Boolean) as Badge[]).slice(0, 3)
  const next = TRACKABLE.find((b) => !earnedSet.has(b.key)) || null

  return (
    <Link
      href="/achievements"
      className="block rounded-xl border border-gray-700 bg-[#0f172a] p-5 transition hover:border-gray-600"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-amber-400" />
          <span className="text-sm font-semibold text-white">Achievements</span>
          <span className="text-xs text-gray-500">
            {earnedCount}/{total}
          </span>
        </div>
        <ChevronRight size={16} className="text-gray-500" />
      </div>

      <div className="mt-4 flex items-center gap-3">
        {latest.length > 0 ? (
          <div className="flex items-center gap-2">
            {latest.map((b) => (
              <span
                key={b.key}
                title={b.title}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              >
                <BadgeIcon name={b.icon} size={18} />
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-400">
            No badges yet. Add income, debts, and bills to start earning.
          </span>
        )}

        {next ? (
          <div className="ml-auto flex items-center gap-2 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Next up</div>
              <div className="text-xs text-gray-300">{next.title}</div>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-700 bg-gray-800/60 text-gray-500">
              <Lock size={14} />
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  )
}