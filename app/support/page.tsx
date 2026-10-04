import type { Metadata } from "next"
import Link from "next/link"
import { BRAND, FEATURE_GROUPS, VISIBLE_TIERS, type Tier } from "@/lib/plans"

// Server component, so it can export metadata directly. Without its own
// canonical this page inherited the root layout's canonical ("/"), which told
// search engines /support was a duplicate of the homepage.
export const metadata: Metadata = {
  title: "Help & Support - Paycheck Planner",
  description:
    "Answers to common Paycheck Planner questions about plans and pricing, data security, bill scanning, and the debt payoff calculator, plus how to reach our support team.",
  alternates: {
    canonical: "/support",
  },
}

// Plan names, prices, and debt limits are read from lib/plans.ts -- the same
// source the pricing page and checkout use. This FAQ used to hard-code
// "Starter $33/year, Premium $66/year" and went stale when the tiers were
// renamed and repriced; reading from the source keeps it from drifting again.
const DEBT_LIMIT_ROW = FEATURE_GROUPS.flatMap((g) => g.rows).find(
  (r) => r.label === "Debts tracked"
)

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function describeTier(tier: Tier): string {
  const price =
    tier.priceAnnual === 0
      ? "$0"
      : `${formatUsd(tier.priceMonthly)}/month or ${formatUsd(tier.priceAnnual)}/year`
  const limit = DEBT_LIMIT_ROW ? DEBT_LIMIT_ROW[tier.id] : undefined
  const debts = typeof limit === "string" ? `, ${limit.toLowerCase()} debts` : ""
  return `${tier.name} (${price}${debts})`
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-8">Help & Support</h1>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>

          <div className="space-y-4">
            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
              <h3 className="font-bold text-green-400 mb-2">How do I use the Debt Payoff Calculator?</h3>
              <p className="text-gray-300">
                Enter your debts with their balance, interest rate, and minimum payment. The calculator will show both Snowball and Avalanche strategies so you can compare which works best for you.
              </p>
            </div>

            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
              <h3 className="font-bold text-green-400 mb-2">How does Bill OCR work?</h3>
              <p className="text-gray-300">
                Take a photo of your bill and our system extracts vendor name, amount, and due date automatically. You can then review and save it to your tracker.
              </p>
            </div>

            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
              <h3 className="font-bold text-green-400 mb-2">Is my data safe?</h3>
              <p className="text-gray-300">
                Your data is encrypted in transit and at rest and protected by access controls. We do not sell your personal information, and we never share it without your consent except as described in our{" "}
                <Link href="/privacy" className="underline underline-offset-4 hover:text-green-400">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
              <h3 className="font-bold text-green-400 mb-2">What are the pricing plans?</h3>
              <p className="text-gray-300">
                {VISIBLE_TIERS.map(describeTier).join(", ")}. Paying yearly gets you two months free on every paid plan. Prices are in US dollars. Start free and upgrade anytime -- see the full feature comparison on our{" "}
                <Link href="/pricing" className="underline underline-offset-4 hover:text-green-400">
                  pricing page
                </Link>
                .
              </p>
            </div>

            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
              <h3 className="font-bold text-green-400 mb-2">Can I cancel my subscription?</h3>
              <p className="text-gray-300">
                Yes, cancel anytime. Your access continues until the end of your current billing period.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-green-500/10 border border-green-500/30 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Need More Help?</h2>
          <p className="text-gray-300 mb-6">
            Our support team is here to help. Email us at <strong>{BRAND.supportEmail}</strong>
          </p>
          <Link
            href="/contact"
            className="inline-block bg-green-500 hover:bg-green-600 text-black font-semibold px-6 py-2 rounded transition"
          >
            Contact Support
          </Link>
        </section>
      </div>
    </div>
  )
}
