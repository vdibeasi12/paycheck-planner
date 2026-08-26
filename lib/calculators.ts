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
  // Cross-links into Paycheck Planner University -- same idea as
  // relatedCalculator on blog posts (see lib/blog.ts / app/calculators/[slug]/page.tsx),
  // just pointed the other direction. Each entry is looked up via
  // lib/university.ts's getLesson(course, lesson).
  relatedLessons?: { course: string; lesson: string }[]
}

export const CALCULATORS: CalculatorMeta[] = [
  {
    slug: "paycheck",
    title: "Paycheck Calculator",
    shortTitle: "Paycheck",
    description: "Estimate your take-home pay after taxes and deductions.",
    seoDescription:
      "Free paycheck calculator -- estimate your take-home pay per paycheck after estimated taxes, pre-tax deductions, and other withholdings.",
    relatedLessons: [
      { course: "paychecks", lesson: "what-actually-comes-out-of-your-paycheck" },
      { course: "paychecks", lesson: "gross-pay-vs-net-pay-the-number-that-matters" },
    ],
  },
  {
    slug: "50-30-20-budget",
    title: "50/30/20 Budget Calculator",
    shortTitle: "50/30/20 Budget",
    description: "Split your take-home pay into needs, wants, and savings.",
    seoDescription:
      "Free 50/30/20 budget calculator -- enter your monthly take-home income and see exactly how much to spend on needs, wants, and savings.",
    relatedLessons: [
      { course: "budgeting", lesson: "why-paycheck-based-budgeting-works" },
      { course: "budgeting", lesson: "needs-vs-wants-the-real-breakdown" },
    ],
  },
  {
    slug: "biweekly-budget",
    title: "Biweekly Budget Calculator",
    shortTitle: "Biweekly Budget",
    description: "See what to set aside from every biweekly paycheck, and which months have 3.",
    seoDescription:
      "Free biweekly budget calculator -- find out how much of every paycheck to set aside for bills, and which months of the year you'll get a 3rd paycheck.",
    relatedLessons: [{ course: "paychecks", lesson: "automating-bills-and-savings-around-your-pay-schedule" }],
  },
  {
    slug: "debt-payoff",
    title: "Debt Payoff Calculator",
    shortTitle: "Debt Payoff",
    description: "See how long it'll take to pay off a debt and how much interest you'll pay.",
    seoDescription:
      "Free debt payoff calculator -- enter your balance, interest rate, and monthly payment to see exactly how many months until it's paid off and the total interest.",
    relatedLessons: [
      { course: "debt", lesson: "debt-snowball-vs-debt-avalanche" },
      { course: "debt", lesson: "calculating-your-real-debt-free-date" },
    ],
  },
  {
    slug: "savings-goal",
    title: "Savings Goal Calculator",
    shortTitle: "Savings Goal",
    description: "Find out how much to save monthly, or how long a goal will take.",
    seoDescription:
      "Free savings goal calculator -- figure out the monthly amount needed to hit a savings goal by a target date, or how long it'll take at a set monthly amount.",
    relatedLessons: [{ course: "saving", lesson: "setting-a-savings-goal-youll-actually-hit" }],
  },
  {
    slug: "monthly-budget",
    title: "Monthly Budget Calculator",
    shortTitle: "Monthly Budget",
    description: "Add up your real expenses against your income and see what's left.",
    seoDescription:
      "Free monthly budget calculator -- itemize your actual expenses against your income and instantly see whether you're in the black or the red.",
    relatedLessons: [{ course: "budgeting", lesson: "building-your-first-paycheck-budget" }],
  },
  {
    slug: "emergency-fund",
    title: "Emergency Fund Calculator",
    shortTitle: "Emergency Fund",
    description: "Find out how big your emergency fund should be, and how long it'll take to build.",
    seoDescription:
      "Free emergency fund calculator -- enter your essential monthly expenses to find your target emergency fund size, then see how long it'll take to save.",
    relatedLessons: [
      { course: "saving", lesson: "why-you-need-an-emergency-fund-first" },
      { course: "saving", lesson: "how-big-should-your-emergency-fund-be" },
    ],
  },
]

export function getCalculatorMeta(slug: string): CalculatorMeta | undefined {
  return CALCULATORS.find((c) => c.slug === slug)
}
