"use client"

import UpgradeButton from "@/app/components/UpgradeButton"
import { getDebtSummary } from "@/lib/previewEngine"
import { Debt } from "@/lib/financeEngine"
import { TIERS, effectiveMonthly } from "@/lib/plans"

export default function PaywallCard({
  user,
  debts,
}: {
  user: any
  debts: Debt[]
}) {
  const summary = getDebtSummary(debts)

  // Single source of truth: the Premium tier drives the price shown here,
  // so this card can never drift from /pricing or Stripe again.
  const premium = TIERS.find((t) => t.id === "premium")!
  const annualMonthly = effectiveMonthly(premium.priceAnnual)

  return (
    <div className="bg-white p-8 rounded-xl shadow text-center max-w-xl mx-auto">

      {/* 🔥 HEADLINE */}
      <h2 className="text-2xl font-bold mb-2">
        You could be debt-free in {summary.months} months
      </h2>

      {/* ⚠️ URGENCY */}
      <p className="text-red-500 font-medium mb-4">
        You're paying about ${summary.monthlyInterest}/month in interest
      </p>

      {/* VALUE */}
      <p className="text-gray-500 mb-6">
        Stop wasting money on interest. Unlock your full payoff plan and eliminate debt faster.
      </p>

      {/* FEATURES */}
      <div className="text-left mb-6 space-y-2">
        <p>✅ Full payoff timeline</p>
        <p>✅ Strategy comparison (snowball vs avalanche)</p>
        <p>✅ Interest savings breakdown</p>
        <p>✅ Financial stress test</p>
      </div>

      {/* PRICE — pulled from lib/plans.ts (Premium tier) */}
      <div className="mb-6">
        <p className="text-3xl font-bold">${premium.priceMonthly}/month</p>
        <p className="text-green-600 font-medium">
          or ${premium.priceAnnual}/year — just ${annualMonthly}/mo, billed yearly
        </p>
      </div>

      <UpgradeButton />

      <p className="text-xs text-gray-400 mt-4">
        Cancel anytime. No risk.
      </p>
    </div>
  )
}
