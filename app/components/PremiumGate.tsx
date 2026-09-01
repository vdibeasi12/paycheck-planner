"use client"

import { useState } from "react"
import { useIsIOSApp } from "@/lib/platform"

type Props = {
  isSubscribed: boolean
  children: React.ReactNode
}

export default function PremiumGate({ isSubscribed, children }: Props) {
  const ios = useIsIOSApp()
  const [loading, setLoading] = useState(false)

  if (isSubscribed) return <>{children}</>

  async function startCheckout() {
    // iOS purchases through RevenueCat/StoreKit on the full pricing page
    // (see app/pricing/page.tsx) -- Guideline 3.1.1 requires the real
    // purchase to go through Apple's IAP, not a Stripe checkout link.
    if (ios) {
      window.location.href = "/pricing"
      return
    }
    try {
      setLoading(true)
      const res = await fetch("/api/stripe/checkout", { method: "POST" })
      const data = await res.json().catch(() => null)
      if (data?.url) {
        window.location.href = data.url
        return
      }
      window.location.href = "/pricing"
    } catch {
      window.location.href = "/pricing"
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
      <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
      <p className="text-sm text-slate-400 mb-4">
        Unlock advanced insights, payoff strategies, and your optimized plan.
      </p>

      <button
        onClick={startCheckout}
        disabled={loading}
        className="bg-emerald-500 text-black px-4 py-2 rounded-lg font-semibold disabled:opacity-60"
      >
        {loading ? "Redirecting..." : "Upgrade Now"}
      </button>
    </div>
  )
}
