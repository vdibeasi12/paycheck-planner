import type { Metadata } from "next"
import Link from "next/link"
import { TrendingDown } from "lucide-react"
import { DEBT_AMOUNTS, debtSlug, money } from "@/lib/pseoPages"

export const metadata: Metadata = {
  title: "Debt Payoff Plans by Amount - How Long & How Much Interest - Paycheck Planner",
  description:
    "See exactly how long it takes and how much interest you'll pay to get out of debt, for balances from $1,000 to $100,000, compared across realistic monthly payments.",
  alternates: {
    canonical: "/debt-payoff-plans",
  },
}

export default function DebtPayoffPlansIndexPage() {
  return (
    <div className="min-h-screen bg-[#020617] py-12 text-white">
      <div className="mx-auto max-w-4xl px-6">
        <h1 className="mb-3 text-4xl font-bold">Debt Payoff Plans by Amount</h1>
        <p className="mb-10 text-gray-400">
          Pick your balance to see how many months it takes to pay off and how much interest you&apos;ll pay,
          compared across several realistic monthly payment amounts -- all calculated, not templated.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {DEBT_AMOUNTS.map((amount) => (
            <Link
              key={amount}
              href={`/${debtSlug(amount)}`}
              className="flex items-center gap-3 rounded-2xl border border-gray-800 bg-[#0f172a] p-5 transition hover:border-gray-700"
            >
              <TrendingDown size={20} className="shrink-0 text-emerald-400" />
              <p className="font-semibold text-white">{money(amount)}</p>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-sm text-gray-500">
          Want to budget around a specific salary too?{" "}
          <Link href="/budget-by-salary" className="text-emerald-400 hover:underline">
            See budget breakdowns by salary
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
