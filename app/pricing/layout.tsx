import type { Metadata } from "next"
import { VISIBLE_TIERS } from "@/lib/plans"

// The pricing page is a client component and can't export metadata itself,
// so its title, description, and canonical live here. Prices are read from
// lib/plans.ts so the search snippet can never disagree with the page.
const paidSummary = VISIBLE_TIERS.filter((t) => t.priceAnnual > 0)
  .map((t) => `${t.name} ($${t.priceAnnual.toFixed(2)}/yr)`)
  .join(", ")

export const metadata: Metadata = {
  title: "Pricing - Paycheck Planner Plans",
  description: `Compare Paycheck Planner plans: Free, ${paidSummary}. Two months free with annual billing. Start free, no card required.`,
  alternates: {
    canonical: "/pricing",
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
