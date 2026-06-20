"use client"

import { useState } from "react"
import { useIsNativeApp } from "@/lib/platform"

type Props = {
  show: boolean
  monthlyLoss?: number
}

export default function UpgradeBanner({ show, monthlyLoss = 0 }: Props) {
  const native = useIsNativeApp()
  const [loading, setLoading] = useState(false)

  // Never present a purchase CTA inside the native shell (App Store 3.1.1).
  // Hiding the whole banner is correct: subscriptions are managed on the web.
  if (!show || native !== false) return null

  async function startCheckout() {
    try {
      setLoading(true)
      const res = await fetch("/api/stripe/checkout", { method: "POST" })
      const data = await res.json().catch(() => null)
      if (data?.url) {
        window.location.href = data.url
        return
      }
      // No URL: not signed in / price not configured. Send somewhere useful.
      window.location.href = "/pricing"
    } catch {
      window.location.href = "/pricing"
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sticky top-0 z-50 bg-emerald-500 text-black px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <p className="text-sm font-semibold">
          You're losing ${monthlyLoss.toFixed(0)}/month in interest
        </p>
        <button
          onClick={startCheckout}
          disabled={loading}
          className="bg-black text-white px-4 py-1 rounded-lg text-sm font-semibold disabled:opacity-60"
        >
          {loading ? "Redirecting..." : "Stop the Leak"}
        </button>
      </div>
    </div>
  )
}