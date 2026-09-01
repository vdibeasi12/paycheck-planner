"use client"

import { useState } from "react"
import { useIsIOSApp } from "@/lib/platform"
import { trackCta } from "@/lib/trackClient"

export default function UpgradeButton() {
  const ios = useIsIOSApp()
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    trackCta('upgrade')

    // iOS purchases through RevenueCat/StoreKit on the full pricing page,
    // which needs a tier + billing-period choice this small button doesn't
    // carry -- send iOS there instead of duplicating the purchase flow here.
    // Guideline 3.1.1: this used to just hide on iOS while Android/web got a
    // real checkout link; now iOS gets a real purchase path too, it's just
    // one tap further away.
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

      // No URL means the session wasn't created (not signed in, price not
      // configured, etc.). Send the user somewhere actionable instead of
      // silently doing nothing — which was the original bug.
      console.error("Checkout did not return a URL:", data)
      window.location.href = "/pricing"
    } catch (err) {
      console.error("Upgrade failed:", err)
      window.location.href = "/pricing"
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-6 py-3 rounded-lg font-semibold"
    >
      {loading ? "Redirecting…" : "Upgrade to Pro"}
    </button>
  )
}
