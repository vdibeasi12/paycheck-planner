"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function PricingPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly")

  const plans = [
    {
      name: "Free",
      priceMonthly: "$0",
      priceAnnual: "$0",
      features: [
        { name: "Up to 3 debts", included: true },
        { name: "Manual tracking", included: true },
        { name: "Basic dashboard", included: true },
        { name: "Charts", included: false },
        { name: "Snowball & Avalanche", included: false },
        { name: "AI insights", included: false },
        { name: "Advanced analytics", included: false },
      ],
      button: "Get Started Free",
      disabled: false,
      action: () => router.push("/signup"),
    },
    {
      name: "Starter",
      priceMonthly: "$3/mo",
      priceAnnual: "$33/year",
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY,
      priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY,
      features: [
        { name: "Up to 10 debts", included: true },
        { name: "Manual tracking", included: true },
        { name: "Basic dashboard", included: true },
        { name: "Charts", included: true },
        { name: "Snowball & Avalanche", included: false },
        { name: "AI insights", included: false },
        { name: "Advanced analytics", included: false },
      ],
      button: "Upgrade to Starter",
      action: () => router.push("/signup"),
    },
    {
      name: "Premium",
      priceMonthly: "$6/mo",
      priceAnnual: "$66/year",
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY,
      priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY,
      features: [
        { name: "Unlimited debts", included: true },
        { name: "Manual tracking", included: true },
        { name: "Basic dashboard", included: true },
        { name: "Charts", included: true },
        { name: "Snowball & Avalanche", included: true },
        { name: "AI insights", included: true },
        { name: "Advanced analytics", included: true },
      ],
      button: "Upgrade to Premium",
      highlight: true,
      action: () => router.push("/signup"),
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Start free, upgrade anytime. All plans include core features.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                billing === "monthly"
                  ? "bg-green-500 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                billing === "annual"
                  ? "bg-green-500 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Annual (Save 8%)
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, idx) => {
            const price =
              billing === "monthly" ? plan.priceMonthly : plan.priceAnnual

            return (
              <div
                key={idx}
                className={`relative border rounded-xl p-8 transition-all duration-300 ${
                  plan.highlight
                    ? "border-green-500 bg-gradient-to-br from-green-500/5 to-transparent shadow-lg shadow-green-500/20 transform hover:scale-105"
                    : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                }`}
              >
                {/* Most Popular Badge */}
                {plan.highlight && (
                  <div className="absolute -top-4 right-6 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                    MOST POPULAR
                  </div>
                )}

                {/* Plan Name & Price */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {plan.name}
                  </h2>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-white">
                      {price}
                    </span>
                    {price !== "$0" && (
                      <span className="text-slate-400 ml-2">
                        per {billing === "monthly" ? "month" : "year"}
                      </span>
                    )}
                  </div>
                  {billing === "annual" && plan.name !== "Free" && (
                    <p className="text-sm text-green-400 mt-2 font-semibold">
                      💰 Best value
                    </p>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, i) => (
                    <li
                      key={i}
                      className={`flex items-center gap-3 text-sm ${
                        f.included
                          ? "text-slate-300"
                          : "text-slate-500 line-through"
                      }`}
                    >
                      {f.included ? (
                        <span className="text-green-400 font-bold">✓</span>
                      ) : (
                        <span className="text-slate-600">✕</span>
                      )}
                      {f.name}
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={plan.action}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    plan.highlight
                      ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-green-500/50"
                      : "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 hover:border-green-500"
                  }`}
                >
                  {plan.button}
                </button>
              </div>
            )
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-slate-400 mb-4">
            All plans include unlimited access to core features.
          </p>
          <p className="text-slate-400">
            Questions? Check our{" "}
            <Link href="/terms" className="text-green-400 hover:text-green-300">
              Terms of Service
            </Link>{" "}
            or{" "}
            <Link href="/privacy" className="text-green-400 hover:text-green-300">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}