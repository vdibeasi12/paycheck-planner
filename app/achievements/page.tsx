"use client"

import { useEffect, useState } from "react"
import { Loader2, Trophy } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { withTimeout } from "@/lib/withTimeout"
import { BADGES } from "@/lib/achievements"
import { celebrate } from "@/lib/confetti"
import BadgeCard from "@/app/components/BadgeCard"

type EarnedRow = { badge_key: string; earned_at: string | null }

export default function AchievementsPage() {
  const [earned, setEarned] = useState<Record<string, string | null> | null>(null)

  useEffect(() => {
    let active = true

    const run = async () => {
      try {
        // Bounded for the same reason as the query below: this fetch had no
        // timeout at all, so a slow/stuck /api/achievements/check response
        // (the WebView-hang class of issue lib/withTimeout.ts exists for)
        // left `earned` at null forever -- the page stuck on "Loading your
        // badges..." with no way out, even though the withTimeout guard
        // below looks like it should already prevent exactly that. Caught
        // live in a screen recording of the app (Aug 25 2026): login -> MFA
        // -> Dashboard all loaded fine, but the dedicated Achievements page
        // spun indefinitely because this earlier, unguarded fetch never
        // resolved and the code never reached the protected block.
        const res = await withTimeout(
          fetch("/api/achievements/check", { method: "POST" }),
          8000,
          null as Response | null
        )
        if (res) {
          const json = await res.json().catch(() => ({}))
          if (Array.isArray(json?.newlyEarned) && json.newlyEarned.length > 0) celebrate()
        }
      } catch {
        // ignore
      }

      // Bounded + guarded: right after a fresh sign-in (especially the hard
      // navigation Google login does on mobile, see NativeInit.tsx) this
      // browser-side query can hang instead of resolving or rejecting --
      // same supabase-js WebView lock-contention issue already worked
      // around on the account page (see lib/withTimeout.ts). Without this,
      // `earned` stays null forever and the page never leaves "Loading your
      // badges..." until the user manually refreshes.
      try {
        const { data } = await withTimeout(
          supabase.from("achievements").select("badge_key, earned_at"),
          8000,
          { data: [] as EarnedRow[] } as any
        )
        const map: Record<string, string | null> = {}
        ;(data || []).forEach((r: EarnedRow) => {
          map[r.badge_key] = r.earned_at
        })
        if (active) setEarned(map)
      } catch {
        if (active) setEarned({})
      }
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
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
            <Trophy size={18} className="text-amber-400" />
          </span>
          <h1 className="text-2xl font-bold text-white">Achievements</h1>
        </div>
        <p className="mt-2 text-sm text-gray-400">
          Earn badges as you take control of your money.
          {earned ? " " + earnedCount + " of " + trackable.length + " unlocked." : ""}
        </p>

        {!earned ? (
          <div className="mt-10 flex items-center gap-2 text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Loading your badges...
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BADGES.map((b) => (
              <BadgeCard key={b.key} badge={b} earned={b.key in earned} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
