"use client"

import { useEffect } from "react"
import { isNativeApp } from "@/lib/platform"
import { supabase } from "@/lib/supabase/client"
import { hasHitReviewMoment } from "@/lib/reviewPrompt"

/**
 * Mounted once at the app root for logged-in users (see app/layout.tsx),
 * same "native-only, logged-in-only" posture as PushNotificationsInit. A
 * no-op on the web.
 *
 * Task #23: ask for an App Store / Play Store review after a genuine value
 * moment -- 3 paycheck (income) sources added, or a savings goal fully
 * funded (see lib/reviewPrompt.ts) -- never immediately after install, and
 * only ever once per account (profiles.review_prompt_shown_at).
 *
 * requestReview() is a request, not a guarantee: iOS and Android both
 * silently throttle how often they'll actually surface the dialog to a
 * given user (Apple caps at 3 prompts per 365 days app-wide, across every
 * app that asks; it frequently shows nothing at all). We mark
 * review_prompt_shown_at right before calling it, not after, so a plugin
 * failure or a rejected/ignored request can never leave us re-asking on
 * the next launch -- this is our one intentional ask per account, not a
 * retry loop.
 */
export default function ReviewPromptInit() {
  useEffect(() => {
    if (!isNativeApp()) return

    let cancelled = false

    ;(async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user || cancelled) return

        const { data: profile } = await supabase
          .from("profiles")
          .select("review_prompt_shown_at")
          .eq("id", user.id)
          .maybeSingle()
        if (cancelled || !profile || profile.review_prompt_shown_at) return

        const [{ count: incomeCount }, { data: goalRows }] = await Promise.all([
          supabase.from("income").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("financial_goals").select("current_amount, target_amount").eq("user_id", user.id),
        ])
        if (cancelled) return

        const anyGoalCompleted = (goalRows || []).some(
          (g: any) => Number(g.target_amount) > 0 && Number(g.current_amount) >= Number(g.target_amount)
        )

        if (!hasHitReviewMoment({ incomeCount: incomeCount || 0, anyGoalCompleted })) return

        await supabase
          .from("profiles")
          .update({ review_prompt_shown_at: new Date().toISOString() })
          .eq("id", user.id)

        const { InAppReview } = await import("@capacitor-community/in-app-review")
        await InAppReview.requestReview()
      } catch {
        // Plugin unavailable, network hiccup, etc -- never block app
        // startup over an app-store review prompt.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
