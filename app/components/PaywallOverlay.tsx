"use client"

import { useState } from "react"
import { isNativeApp, useIsIOSApp } from "@/lib/platform"
import { getIAPPackages, purchaseIAPPackage } from "@/lib/iap"
import { planForPriceId, TIERS } from "@/lib/plans"
import { supabase } from "@/lib/supabase/client"

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
  const [error, setError] = useState<string | null>(null)
  const ios = useIsIOSApp()

  const handleIOSCheckout = async () => {
    setError(null)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = "/signup?next=/pricing"
      return
    }

    // This overlay only knows the Stripe priceId it was given -- resolve it
    // to a tier, then to that tier's RevenueCat package identifier (see
    // lib/plans.ts's `iap` field). Billing period isn't encoded in priceId
    // callers of this component, so default to monthly; annual purchases
    // happen from the full pricing page.
    const tierId = planForPriceId(priceId)
    const tier = TIERS.find((t) => t.id === tierId)
    const packageId = tier?.iap?.monthly
    if (!packageId) {
      console.error(`No RevenueCat package configured for priceId "${priceId}"`)
      setError("This feature isn't available right now.")
      return
    }

    setLoading(true)
    try {
      const packages = await getIAPPackages()
      const pkg = packages.find(
        (p) => p.identifier === packageId || p.product.identifier === packageId
      )
      if (!pkg) {
        setError("This feature isn't available right now.")
        return
      }
      const result = await purchaseIAPPackage(pkg)
      if (!result.ok) {
        if (!result.cancelled) setError("We couldn't complete the purchase. Please try again.")
        return
      }
      await fetch("/api/revenuecat/confirm", { method: "POST" }).catch(() => {})
      window.location.reload()
    } catch (err) {
      console.error("IAP purchase error:", err)
      setError("We couldn't reach the App Store. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCheckout = async () => {
    // Guideline 3.1.1: iOS purchases go through RevenueCat/StoreKit, right
    // here in the overlay, instead of Stripe checkout. Google Play has no
    // equivalent restriction, so Android keeps using Stripe below, same as
    // web.
    if (ios) {
      await handleIOSCheckout()
      return
    }

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
        // Android only reaches here. Open in an in-app browser overlay
        // instead of window.location.href -- that would navigate the app's
        // own Capacitor webview to checkout.stripe.com, breaking the native
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

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="bg-green-500 hover:bg-green-600 text-black px-5 py-2 rounded-lg font-medium"
        >
          {loading ? "Redirecting..." : "Upgrade Now"}
        </button>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  )
}
