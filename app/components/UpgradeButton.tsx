"use client"

import { useIsNativeApp } from "@/lib/platform"

export default function UpgradeButton() {
  const native = useIsNativeApp()

  const handleUpgrade = async () => {
    const res = await fetch("/api/stripe/checkout", { method: "POST" })
    const data = await res.json()
    if (data?.url) window.location.href = data.url
  }

  // Do not present an in-app purchase action inside the native app
  // (App Store Guideline 3.1.1). Subscriptions are managed on the web.
  if (native !== false) return null

  return (
    <button
      onClick={handleUpgrade}
      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
    >
      Upgrade to Pro
    </button>
  )
}
