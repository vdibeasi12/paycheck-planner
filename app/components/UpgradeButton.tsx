"use client"

import { useState } from "react"
import { useIsNativeApp } from "@/lib/platform"

export default function UpgradeButton() {
  const native = useIsNativeApp()
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
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

  // Do not present an in-app purchase action inside the native app
  // (App Store Guideline 3.1.1). Subscriptions are managed on the web.
  if (native !== false) return null

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
