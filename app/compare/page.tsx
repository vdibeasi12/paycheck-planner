import type { Metadata } from "next"
import Link from "next/link"
import { Scale, ArrowRight } from "lucide-react"
import { COMPARISONS } from "@/lib/comparisons"

export const metadata: Metadata = {
  title: "Paycheck Planner vs. Other Budgeting Apps - Honest Comparisons",
  description:
    "Honest, feature-by-feature comparisons of Paycheck Planner against YNAB, EveryDollar, Rocket Money, and Goodbudget -- including who each app is actually best for.",
  alternates: {
    canonical: "/compare",
  },
}

export default function CompareIndexPage() {
  return (
    <div className="min-h-screen bg-[#020617] py-12 text-white">
      <div className="mx-auto max-w-4xl px-6">
        <h1 className="mb-3 text-4xl font-bold">Paycheck Planner vs. Other Budgeting Apps</h1>
        <p className="mb-10 text-gray-400">
          Every budgeting app is a fit for someone. Here's an honest, side-by-side look at how
          Paycheck Planner compares -- including who's actually better served by the other
          option.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {COMPARISONS.map((c) => (
            <Link
              key={c.slug}
              href={`/compare/${c.slug}`}
              className="flex items-start gap-4 rounded-2xl border border-gray-800 bg-[#0f172a] p-6 transition hover:border-gray-700"
            >
              <Scale size={24} className="mt-0.5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold text-white">Paycheck Planner vs. {c.name}</p>
                <p className="mt-1 text-sm text-gray-400">{c.tagline}</p>
              </div>
            </Link>
          ))}
        </div>

        <Link
          href="/best-budgeting-apps-paycheck-to-paycheck"
          className="mt-8 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 transition hover:border-emerald-500/50"
        >
          <div>
            <p className="font-semibold text-white">
              Best Budgeting Apps for Paycheck-to-Paycheck Living
            </p>
            <p className="mt-1 text-sm text-gray-400">
              A roundup of all of the above, for people specifically budgeting between paychecks.
            </p>
          </div>
          <ArrowRight size={20} className="shrink-0 text-emerald-400" />
        </Link>
      </div>
    </div>
  )
}
