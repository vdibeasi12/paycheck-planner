"use client"

import { useState } from "react"
import { useIsNativeApp } from "@/lib/platform"

type Props = {
  priceId: string
  title?: string
  description?: string
}

export default function PaywallOverlay({
  priceId,
  title = "Upgrade to unlock",
  description = "This feature requires an upgrade.",
}: Props) {
  const [loading, setLoading] = useState(false)
  const native = useIsNativeApp()

  const handleCheckout = async () => {
    setLoading(true)

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ priceId }),
    })

    const data = await res.json()

    if (data.url) {
      window.location.href = data.url
    }

    setLoading(false)
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl" />

      <div className="relative z-30 text-center px-6">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-300 mb-4">{description}</p>

        {native === false ? (
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-black px-5 py-2 rounded-lg font-medium"
          >
            {loading ? "Redirecting..." : "Upgrade Now"}
          </button>
        ) : (
          <p className="text-gray-300 text-sm">
            Manage your plan at paycheckplanner.ai
          </p>
        )}
      </div>
    </div>
  )
}