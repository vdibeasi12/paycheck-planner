"use client"

import UpgradeButton from "@/app/components/UpgradeButton"
import { getDebtSummary } from "@/lib/previewEngine"
import { Debt } from "@/lib/financeEngine"

export default function PaywallCard({
  user,
  debts,
}: {
  user: any
  debts: Debt[]
}) {
  const summary = getDebtSummary(debts)

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

      {/* PRICE */}
      <div className="mb-6">
        <p className="text-3xl font-bold">$9/month</p>
        <p className="text-green-600 font-medium">
          7-day free trial
        </p>
      </div>

      <UpgradeButton user={user} />

      <p className="text-xs text-gray-400 mt-4">
        Cancel anytime. No risk.
      </p>
    </div>
  )
}