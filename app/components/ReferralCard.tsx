"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Gift, Loader2, Check, Copy } from "lucide-react"

type State = {
  code: string
  plan: string
  rewardGranted: boolean
  completedCount: number
} | null

const GOAL = 3

export default function ReferralCard() {
  const [state, setState] = useState<State>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth?.user
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code, plan, referral_reward_granted")
        .eq("id", user.id)
        .single()

      const { count } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", user.id)
        .eq("status", "completed")

      if (!active || !profile) return
      setState({
        code: profile.referral_code,
        plan: profile.plan,
        rewardGranted: !!profile.referral_reward_granted,
        completedCount: count || 0,
      })
    })()
    return () => {
      active = false
    }
  }, [])

  if (!state) {
    return (
      <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6 shadow-sm">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 size={16} className="animate-spin" /> Loading...
        </div>
      </div>
    )
  }

  const link = `${window.location.origin}/signup?ref=${state.code}`
  const remaining = Math.max(0, GOAL - state.completedCount)
  const pct = Math.min(100, Math.round((state.completedCount / GOAL) * 100))

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can fail (permissions, insecure context) --
      // the link is still visible and selectable in the input either way.
    }
  }

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Gift size={20} className="text-emerald-500" />
        <h2 className="text-lg font-semibold text-white">Refer & Earn</h2>
      </div>
      <p className="mt-1 text-sm text-gray-400">
        Give a friend a free month of Momentum when they finish setting up. Get your own
        Momentum upgrade after 3 friends complete onboarding.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          value={link}
          readOnly
          onFocus={(e) => e.target.select()}
          className="flex-1 rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-sm text-white outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {state.rewardGranted || state.plan !== "free" ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-400">
          <Check size={16} /> Reward unlocked -- thanks for spreading the word.
        </p>
      ) : (
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-gray-400">
            <span>
              {state.completedCount} of {GOAL} friends joined
            </span>
            <span>{remaining === 0 ? "Unlocking..." : `${remaining} more to go`}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
