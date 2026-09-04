"use client"

import { Check, Lock } from "lucide-react"
import type { Badge } from "@/lib/achievements"
import BadgeIcon from "./badgeIcon"

type Props = {
  badge: Badge
  earned: boolean
}

// Shared badge-card visual, used by the full Achievements grid
// (app/achievements/page.tsx) and reused by AchievementsStrip's compact
// circles for the same per-badge accent color. Every badge in the catalog is
// trackable now (see lib/achievements.ts's Sep 4 2026 note), so there's no
// "coming soon" state left to render -- a badge is either earned or locked.
export default function BadgeCard({ badge, earned }: Props) {
  const accent = badge.accent

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4 transition"
      style={
        earned
          ? { borderColor: `${accent}66`, background: `${accent}14` }
          : { borderColor: "#1f2937", background: "#0f172a" }
      }
    >
      {earned && (
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full blur-2xl"
          style={{ background: accent, opacity: 0.25 }}
        />
      )}

      <div className="relative flex items-center justify-between">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={
            earned
              ? { background: `${accent}26`, color: accent, boxShadow: `0 0 0 1px ${accent}40 inset` }
              : { background: "#1e293b", color: "#64748b" }
          }
        >
          <BadgeIcon name={badge.icon} size={20} />
        </span>
        {earned ? (
          <span
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: accent, background: `${accent}1f` }}
          >
            <Check size={11} strokeWidth={3} /> Earned
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
            <Lock size={11} /> Locked
          </span>
        )}
      </div>

      <div className="relative mt-3 text-sm font-semibold text-white">{badge.title}</div>
      <div className="relative mt-1 text-xs text-gray-400">{badge.description}</div>
    </div>
  )
}
