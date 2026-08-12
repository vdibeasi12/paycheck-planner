import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CALCULATORS, getCalculatorMeta } from "@/lib/calculators"
import PaycheckCalculator from "@/app/components/calculators/PaycheckCalculator"
import FiftyThirtyTwentyCalculator from "@/app/components/calculators/FiftyThirtyTwentyCalculator"
import BiweeklyBudgetCalculator from "@/app/components/calculators/BiweeklyBudgetCalculator"
import DebtPayoffCalculator from "@/app/components/calculators/DebtPayoffCalculator"
import SavingsGoalCalculator from "@/app/components/calculators/SavingsGoalCalculator"
import MonthlyBudgetCalculator from "@/app/components/calculators/MonthlyBudgetCalculator"

const COMPONENTS: Record<string, React.ComponentType> = {
  paycheck: PaycheckCalculator,
  "50-30-20-budget": FiftyThirtyTwentyCalculator,
  "biweekly-budget": BiweeklyBudgetCalculator,
  "debt-payoff": DebtPayoffCalculator,
  "savings-goal": SavingsGoalCalculator,
  "monthly-budget": MonthlyBudgetCalculator,
}

export function generateStaticParams() {
  return CALCULATORS.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const meta = getCalculatorMeta(slug)
  if (!meta) return {}
  return {
    title: `${meta.title} - Paycheck Planner`,
    description: meta.seoDescription,
    alternates: {
      canonical: `/calculators/${meta.slug}`,
    },
  }
}

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const meta = getCalculatorMeta(slug)
  const Component = COMPONENTS[slug]
  if (!meta || !Component) notFound()

  return (
    <div className="min-h-screen bg-[#020617] py-12 text-white">
      <div className="mx-auto max-w-2xl px-6">
        <Link href="/calculators" className="text-sm font-semibold text-emerald-400 hover:underline">
          &larr; All calculators
        </Link>
        <h1 className="mb-2 mt-4 text-3xl font-bold">{meta.title}</h1>
        <p className="mb-8 text-gray-400">{meta.description}</p>

        <Component />

        <div className="mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
          <p className="font-semibold text-white">Want this handled automatically every paycheck?</p>
          <p className="mt-1 text-sm text-gray-400">
            Paycheck Planner does this math for you and keeps it updated as your bills and income
            change.
          </p>
          <Link
            href="/signup"
            className="mt-4 inline-block rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
          >
            Try Paycheck Planner free
          </Link>
        </div>
      </div>
    </div>
  )
}
