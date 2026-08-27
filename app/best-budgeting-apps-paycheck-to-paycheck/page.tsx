import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { COMPARISONS } from "@/lib/comparisons"

export const metadata: Metadata = {
  title: "Best Budgeting Apps for Paycheck-to-Paycheck Living (2026)",
  description:
    "An honest roundup of the best budgeting apps for people living paycheck to paycheck -- Paycheck Planner, YNAB, EveryDollar, Rocket Money, and Goodbudget -- and who each one is actually best for.",
  alternates: {
    canonical: "/best-budgeting-apps-paycheck-to-paycheck",
  },
  openGraph: {
    title: "Best Budgeting Apps for Paycheck-to-Paycheck Living (2026)",
    description:
      "An honest roundup of the best budgeting apps for people living paycheck to paycheck, and who each one is actually best for.",
    url: "https://paycheckplanner.ai/best-budgeting-apps-paycheck-to-paycheck",
    type: "article",
  },
}

export default function BestBudgetingAppsRoundupPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Best Budgeting Apps for Paycheck-to-Paycheck Living",
    description: metadata.description,
    publisher: { "@id": "https://paycheckplanner.ai/#organization" },
    mainEntityOfPage: "https://paycheckplanner.ai/best-budgeting-apps-paycheck-to-paycheck",
  }

  return (
    <div className="min-h-screen bg-[#020617] py-12 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-3xl px-6">
        <Link href="/compare" className="text-sm font-semibold text-emerald-400 hover:underline">
          &larr; All comparisons
        </Link>

        <h1 className="mt-4 text-4xl font-bold">
          Best Budgeting Apps for Paycheck-to-Paycheck Living
        </h1>
        <p className="mt-2 text-lg text-gray-400">
          Living paycheck to paycheck is a specific problem: the question isn't "what did I spend
          this month," it's "will the money I have right now cover what's due before my next
          paycheck lands." Most budgeting apps were built around monthly categories, not that
          question. Here's an honest look at five apps, including which one actually fits that
          situation best.
        </p>

        <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <p className="font-semibold text-white">Our pick: Paycheck Planner</p>
          <p className="mt-2 text-sm text-gray-300">
            Built specifically around when your paychecks land -- biweekly, weekly, or irregular
            -- rather than a generic monthly calendar. Free tier includes credit-card-linked balances and
            unlimited budget categories, with a built-in debt snowball/avalanche comparison that
            shows an actual debt-free date. If your budgeting problem is "make it to the next
            paycheck," this is the app built around that exact problem.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-400"
            >
              Start free <ArrowRight size={15} />
            </Link>
            <Link
              href="/calculators/paycheck"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-6 py-3 text-sm font-semibold text-white hover:border-gray-500"
            >
              Try the free paycheck calculator
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            New to budgeting by paycheck instead of by month?{" "}
            <Link
              href="/university/budgeting/why-paycheck-based-budgeting-works"
              className="text-emerald-400 hover:underline"
            >
              Read why paycheck-based budgeting works
            </Link>{" "}
            in Paycheck Planner University.
          </p>
        </div>

        <div className="mt-10 space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            The other four, and who each is actually best for
          </p>
          {COMPARISONS.map((c) => (
            <div key={c.slug} className="rounded-2xl border border-gray-800 bg-[#0f172a] p-6">
              <p className="font-semibold text-white">{c.name}</p>
              <p className="mt-1 text-sm text-gray-400">{c.tagline}</p>
              <div className="mt-3 space-y-1.5">
                {c.competitorStrengths.slice(0, 2).map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gray-500" />
                    {s}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-gray-400">
                <span className="font-medium text-gray-300">Best for: </span>
                {c.bestForCompetitor}
              </p>
              <Link
                href={`/compare/${c.slug}`}
                className="mt-3 inline-block text-sm font-semibold text-emerald-400 hover:underline"
              >
                Full Paycheck Planner vs. {c.name} comparison &rarr;
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-gray-800 bg-[#0f172a] p-6 text-center">
          <p className="font-semibold text-white">Still deciding?</p>
          <p className="mt-1 text-sm text-gray-400">
            Paycheck Planner has a free plan with no credit card required -- see if it fits before
            you commit to anything.
          </p>
          <Link
            href="/signup"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-400"
          >
            Start free <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  )
}
