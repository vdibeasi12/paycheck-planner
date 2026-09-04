// lib/activityStreak.ts
// Bumps profiles.current_streak/longest_streak/last_active_date once per
// calendar day, powering the "On a Roll" (7-day) / "Streak Master" (30-day)
// achievements -- both of which shipped as permanent "coming soon"
// placeholders with no underlying data to ever earn them (see
// lib/achievements.ts). Hooked into the same best-effort, fire-and-forget
// last_active_at update app/dashboard/page.tsx already runs on every
// dashboard load, so it costs nothing extra and needs no new call site.
//
// last_active_date is a plain date (not last_active_at's timestamp) so "did
// they show up today / yesterday / neither" is a simple string comparison
// instead of a time-window calculation.

import type { SupabaseClient } from "@supabase/supabase-js"

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function yesterdayISO(today: string): string {
  const d = new Date(today + "T00:00:00")
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// Best-effort -- never throws. Safe to call unawaited alongside the
// last_active_at update.
export async function bumpActivityStreak(supabase: SupabaseClient, userId: string): Promise<void> {
  try {
    const { data: row } = await supabase
      .from("profiles")
      .select("current_streak, longest_streak, last_active_date")
      .eq("id", userId)
      .maybeSingle()
    if (!row) return

    const today = todayISO()
    if (row.last_active_date === today) return // already bumped today

    const wasYesterday = row.last_active_date === yesterdayISO(today)
    const currentStreak = wasYesterday ? (Number(row.current_streak) || 0) + 1 : 1
    const longestStreak = Math.max(Number(row.longest_streak) || 0, currentStreak)

    await supabase
      .from("profiles")
      .update({
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_active_date: today,
      })
      .eq("id", userId)
  } catch {
    // best-effort only -- streaks/badges are a delight layer, never block
    // the page load that triggered this.
  }
}
