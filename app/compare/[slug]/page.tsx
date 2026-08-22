import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { COMPARISONS, getComparison } from "@/lib/comparisons"

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const c = getComparison(slug)
  if (!c) return {}

  const title = `Paycheck Planner vs. ${c.name}: Which Is Right for You?`
  return {
    title,
    description: c.seoDescription,
    alternates: {
      canonical: `/compare/${c.slug}`,
    },
    openGraph: {
      title,
      description: c.seoDescription,
      url: `https://paycheckplanner.ai/compare/${c.slug}`,
      type: "article",
    },
  }
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const c = getComparison(slug)
  if (!c) notFound()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Paycheck Planner vs. ${c.name}`,
    description: c.seoDescription,
    publisher: { "@id": "https://paycheckplanner.ai/#organization" },
    mainEntityOfPage: `https://paycheckplanner.ai/compare/${c.slug}`,
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
          Paycheck Planner vs. {c.name}
        </h1>
        <p className="mt-2 text-lg text-gray-400">{c.tagline}</p>

        {/* Honest, up front: what the competitor is actually good at. This
            is the section that keeps this page from being the dishonest
            "we're better at everything" comparison Vince explicitly didn't
            want -- a fair comparison states the other product's real
            strengths plainly, not as a hedge before the sales pitch. */}
        <div className="mt-8 rounded-2xl border border-gray-800 bg-[#0f172a] p-6">
          <p className="font-semibold text-white">What {c.name} does well</p>
          <ul className="mt-3 space-y-2">
            {c.competitorStrengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gray-500" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Feature table */}
        <div className="mt-8 overflow-x-auto rounded-2xl border border-gray-800">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-[#0f172a] text-left">
                <th className="p-4 font-semibold text-gray-400">Feature</th>
                <th className="p-4 font-semibold text-emerald-400">Paycheck Planner</th>
                <th className="p-4 font-semibold text-gray-400">{c.name}</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-[#020617]" : "bg-[#0f172a]/50"}>
                  <td className="p-4 font-medium text-gray-300">{row.feature}</td>
                  <td className="p-4 text-white">{row.paycheckPlanner}</td>
                  <td className="p-4 text-gray-400">{row.competitor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-600">{c.pricingNote}</p>

        {/* Who's actually best served by which -- the other half of not
            being a dishonest page. */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-800 bg-[#0f172a] p-6">
            <p className="font-semibold text-white">Pick {c.name} if...</p>
            <p className="mt-2 text-sm text-gray-400">{c.bestForCompetitor}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <p className="font-semibold text-white">Pick Paycheck Planner if...</p>
            <p className="mt-2 text-sm text-gray-300">{c.bestForPaycheckPlanner}</p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
          <p className="font-semibold text-white">See it for yourself</p>
          <p className="mt-1 text-sm text-gray-300">
            Paycheck Planner has a free plan with no credit card required.
          </p>
          <Link
            href="/signup"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-400"
          >
            Start free <ArrowRight size={15} />
          </Link>
        </div>

        <div className="mt-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            More comparisons
          </p>
          <div className="space-y-3">
            {COMPARISONS.filter((other) => other.slug !== c.slug).map((other) => (
              <Link
                key={other.slug}
                href={`/compare/${other.slug}`}
                className="block rounded-xl border border-gray-800 bg-[#0f172a] p-4 transition hover:border-gray-700"
              >
                <p className="font-semibold text-white">Paycheck Planner vs. {other.name}</p>
                <p className="mt-1 text-sm text-gray-400">{other.tagline}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
