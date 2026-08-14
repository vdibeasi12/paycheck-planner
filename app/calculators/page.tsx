import type { Metadata } from "next"
import Link from "next/link"
import { Calculator } from "lucide-react"
import { CALCULATORS } from "@/lib/calculators"

export const metadata: Metadata = {
  title: "Free Financial Calculators - Paycheck Planner",
  description:
    "Free calculators for paycheck take-home pay, the 50/30/20 budget rule, biweekly budgeting, debt payoff, savings goals, monthly budgets, and your emergency fund target.",
  alternates: {
    canonical: "/calculators",
  },
}

export default function CalculatorsIndexPage() {
  return (
    <div className="min-h-screen bg-[#020617] py-12 text-white">
      <div className="mx-auto max-w-4xl px-6">
        <h1 className="mb-3 text-4xl font-bold">Free Financial Calculators</h1>
        <p className="mb-10 text-gray-400">
          Quick, free tools for the paycheck and budgeting math you actually need. No signup
          required.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {CALCULATORS.map((c) => (
            <Link
              key={c.slug}
              href={`/calculators/${c.slug}`}
              className="flex items-start gap-4 rounded-2xl border border-gray-800 bg-[#0f172a] p-6 transition hover:border-gray-700"
            >
              <Calculator size={24} className="mt-0.5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold text-white">{c.title}</p>
                <p className="mt-1 text-sm text-gray-400">{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
