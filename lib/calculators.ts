// lib/calculators.ts
// Metadata for each free calculator tool. Each slug gets its own
// indexable page (app/calculators/[slug]/page.tsx), which looks up the
// matching client component by slug -- same split as lib/blog.ts vs.
// app/blog/[slug]/page.tsx.

export type CalculatorMeta = {
  slug: string
  title: string
  shortTitle: string
  description: string
  seoDescription: string
}

export const CALCULATORS: CalculatorMeta[] = [
  {
    slug: "paycheck",
    title: "Paycheck Calculator",
    shortTitle: "Paycheck",
    description: "Estimate your take-home pay after taxes and deductions.",
    seoDescription:
      "Free paycheck calculator -- estimate your take-home pay per paycheck after estimated taxes, pre-tax deductions, and other withholdings.",
  },
  {
    slug: "50-30-20-budget",
    title: "50/30/20 Budget Calculator",
    shortTitle: "50/30/20 Budget",
    description: "Split your take-home pay into needs, wants, and savings.",
    seoDescription:
      "Free 50/30/20 budget calculator -- enter your monthly take-home income and see exactly how much to spend on needs, wants, and savings.",
  },
  {
    slug: "biweekly-budget",
    title: "Biweekly Budget Calculator",
    shortTitle: "Biweekly Budget",
    description: "See what to set aside from every biweekly paycheck, and which months have 3.",
    seoDescription:
      "Free biweekly budget calculator -- find out how much of every paycheck to set aside for bills, and which months of the year you'll get a 3rd paycheck.",
  },
  {
    slug: "debt-payoff",
    title: "Debt Payoff Calculator",
    shortTitle: "Debt Payoff",
    description: "See how long it'll take to pay off a debt and how much interest you'll pay.",
    seoDescription:
      "Free debt payoff calculator -- enter your balance, interest rate, and monthly payment to see exactly how many months until it's paid off and the total interest.",
  },
  {
    slug: "savings-goal",
    title: "Savings Goal Calculator",
    shortTitle: "Savings Goal",
    description: "Find out how much to save monthly, or how long a goal will take.",
    seoDescription:
      "Free savings goal calculator -- figure out the monthly amount needed to hit a savings goal by a target date, or how long it'll take at a set monthly amount.",
  },
  {
    slug: "monthly-budget",
    title: "Monthly Budget Calculator",
    shortTitle: "Monthly Budget",
    description: "Add up your real expenses against your income and see what's left.",
    seoDescription:
      "Free monthly budget calculator -- itemize your actual expenses against your income and instantly see whether you're in the black or the red.",
  },
]

export function getCalculatorMeta(slug: string): CalculatorMeta | undefined {
  return CALCULATORS.find((c) => c.slug === slug)
}
