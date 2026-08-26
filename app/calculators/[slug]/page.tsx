import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CALCULATORS, getCalculatorMeta } from "@/lib/calculators"
import { getAllPosts } from "@/lib/blog"
import { getLesson } from "@/lib/university"
import PaycheckCalculator from "@/app/components/calculators/PaycheckCalculator"
import FiftyThirtyTwentyCalculator from "@/app/components/calculators/FiftyThirtyTwentyCalculator"
import BiweeklyBudgetCalculator from "@/app/components/calculators/BiweeklyBudgetCalculator"
import DebtPayoffCalculator from "@/app/components/calculators/DebtPayoffCalculator"
import SavingsGoalCalculator from "@/app/components/calculators/SavingsGoalCalculator"
import MonthlyBudgetCalculator from "@/app/components/calculators/MonthlyBudgetCalculator"
import EmergencyFundCalculator from "@/app/components/calculators/EmergencyFundCalculator"

const COMPONENTS: Record<string, React.ComponentType> = {
  paycheck: PaycheckCalculator,
  "50-30-20-budget": FiftyThirtyTwentyCalculator,
  "biweekly-budget": BiweeklyBudgetCalculator,
  "debt-payoff": DebtPayoffCalculator,
  "savings-goal": SavingsGoalCalculator,
  "monthly-budget": MonthlyBudgetCalculator,
  "emergency-fund": EmergencyFundCalculator,
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

  // Reverse of the link added on each blog post (see app/blog/[slug]/page.tsx)
  // -- posts that point readers to this calculator also get linked back from
  // it, so the two content types reinforce each other instead of sitting in
  // isolation.
  const relatedPosts = getAllPosts()
    .filter((p) => p.relatedCalculator === slug)
    .slice(0, 3)

  // Reverse of the "Try it" link we add on each University lesson (see
  // app/university/[course]/[lesson]/page.tsx) -- same relatedLessons idea
  // as relatedCalculator above, just for University instead of the blog.
  const relatedLessons = (meta.relatedLessons ?? [])
    .map(({ course, lesson }) => getLesson(course, lesson))
    .filter((found): found is NonNullable<typeof found> => Boolean(found))

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

        {relatedLessons.length > 0 && (
          <div className="mt-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Learn more in Paycheck Planner University
            </p>
            <div className="space-y-3">
              {relatedLessons.map(({ course, lesson }) => (
                <Link
                  key={`${course.slug}/${lesson.slug}`}
                  href={`/university/${course.slug}/${lesson.slug}`}
                  className="block rounded-xl border border-gray-800 bg-[#0f172a] p-4 transition hover:border-gray-700"
                >
                  <p className="font-semibold text-white">{lesson.title}</p>
                  <p className="mt-1 text-sm text-gray-400">{lesson.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {relatedPosts.length > 0 && (
          <div className="mt-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Related reading
            </p>
            <div className="space-y-3">
              {relatedPosts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="block rounded-xl border border-gray-800 bg-[#0f172a] p-4 transition hover:border-gray-700"
                >
                  <p className="font-semibold text-white">{p.title}</p>
                  <p className="mt-1 text-sm text-gray-400">{p.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
