import type { Metadata } from "next"
import Link from "next/link"
import { Wallet } from "lucide-react"
import { SALARY_AMOUNTS, salarySlug, money } from "@/lib/pseoPages"

export const metadata: Metadata = {
  title: "Salary Budget Breakdowns - Take-Home Pay by Salary - Paycheck Planner",
  description:
    "Real take-home pay and a 50/30/20 monthly budget breakdown for salaries from $30,000 to $150,000, using actual federal tax brackets -- not a generic estimate.",
  alternates: {
    canonical: "/budget-by-salary",
  },
}

export default function BudgetBySalaryIndexPage() {
  return (
    <div className="min-h-screen bg-[#020617] py-12 text-white">
      <div className="mx-auto max-w-4xl px-6">
        <h1 className="mb-3 text-4xl font-bold">Budget by Salary</h1>
        <p className="mb-10 text-gray-400">
          Pick your annual salary to see real take-home pay after estimated taxes, a 50/30/20 monthly budget
          breakdown, and a debt payoff example -- all calculated, not templated.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {SALARY_AMOUNTS.map((amount) => (
            <Link
              key={amount}
              href={`/${salarySlug(amount)}`}
              className="flex items-center gap-3 rounded-2xl border border-gray-800 bg-[#0f172a] p-5 transition hover:border-gray-700"
            >
              <Wallet size={20} className="shrink-0 text-emerald-400" />
              <p className="font-semibold text-white">{money(amount)}/year</p>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-sm text-gray-500">
          Have debt to pay off too?{" "}
          <Link href="/debt-payoff-plans" className="text-emerald-400 hover:underline">
            See payoff plans by debt amount
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
