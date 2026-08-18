"use client"

import { useState } from "react"
import { isNativeApp, useIsIOSApp } from "@/lib/platform"

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
  // App Store Guideline 3.1.1 is an Apple-only restriction (see isIOSApp's
  // doc comment in lib/platform.ts) -- Google Play has no equivalent blanket
  // rule, so only iOS falls back to the informational message. This matches
  // the pattern already used on /pricing and SubscriptionCard; this overlay
  // had been left on the older isNativeApp() gate, which wrongly hid
  // checkout from Android app users too.
  const ios = useIsIOSApp()

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })

      const data = await res.json().catch(() => null)
      if (!data?.url) {
        console.error("Checkout did not return a URL:", data)
        return
      }

      if (isNativeApp()) {
        // Android only reaches here (iOS shows the info message below
        // instead). Open in an in-app browser overlay instead of
        // window.location.href -- that would navigate the app's own
        // Capacitor webview to checkout.stripe.com, breaking the native
        // bridge. Same pattern already used for Google sign-in and the
        // pricing page. Reload once the overlay closes so a completed
        // upgrade is reflected immediately -- the gate that renders this
        // overlay is computed server-side from the user's plan.
        const { Browser } = await import("@capacitor/browser")
        const handle = await Browser.addListener("browserFinished", () => {
          handle.remove()
          window.location.reload()
        })
        await Browser.open({ url: data.url })
      } else {
        window.location.href = data.url
      }
    } catch (err) {
      console.error("Checkout request error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl" />

      <div className="relative z-30 text-center px-6">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-300 mb-4">{description}</p>

        {ios === false ? (
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-black px-5 py-2 rounded-lg font-medium"
          >
            {loading ? "Redirecting..." : "Upgrade Now"}
          </button>
        ) : (
          // Default-deny: during SSR and the brief pre-mount window, ios is
          // still null. Fall back to the info message (not the purchase
          // button) until the platform is confirmed non-iOS, same direction
          // as the `if (native !== false) return null` guard documented on
          // isNativeApp() in lib/platform.ts -- the App Store must never see
          // a purchase action, even for one frame.
          <p className="text-gray-300 text-sm">
            Manage your plan at paycheckplanner.ai
          </p>
        )}
      </div>
    </div>
  )
}