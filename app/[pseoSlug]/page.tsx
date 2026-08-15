// app/[pseoSlug]/page.tsx
// Task #24: programmatic SEO pages by salary and debt amount. Every number
// on these pages is a real calculation (lib/salaryBudget.ts's bracket-based
// tax math, lib/payoffSimulate.ts's actual amortization engine) -- not
// placeholder/templated text. Fully server-rendered (no "use client"): all
// the math runs at request/build time, so the page ships as plain HTML.
//
// One dynamic route serves both "budget-on-<amount>-salary" and
// "payoff-plan-for-<amount>-in-debt" because Next.js route segments can't
// mix static text with a dynamic param in a single folder name (see
// lib/pseoPages.ts for why). Static routes elsewhere in app/ (e.g.
// app/pricing) always take priority over this catch-all at the same level,
// so this can't shadow any existing page.
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  SALARY_AMOUNTS,
  DEBT_AMOUNTS,
  ASSUMED_APR,
  salarySlug,
  debtSlug,
  parseSalarySlug,
  parseDebtSlug,
  getSalaryPageData,
  getDebtPageData,
  money,
} from "@/lib/pseoPages"

export function generateStaticParams() {
  return [...SALARY_AMOUNTS.map((a) => ({ pseoSlug: salarySlug(a) })), ...DEBT_AMOUNTS.map((a) => ({ pseoSlug: debtSlug(a) }))]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pseoSlug: string }>
}): Promise<Metadata> {
  const { pseoSlug } = await params

  const salaryAmount = parseSalarySlug(pseoSlug)
  if (salaryAmount !== null) {
    return {
      title: `Budget on a ${money(salaryAmount)} Salary - Take-Home Pay & 50/30/20 Plan`,
      description: `See real take-home pay for a ${money(salaryAmount)} salary after estimated federal tax, Social Security, and Medicare, plus a 50/30/20 monthly budget breakdown and a debt payoff example.`,
      alternates: { canonical: `/${pseoSlug}` },
    }
  }

  const debtAmount = parseDebtSlug(pseoSlug)
  if (debtAmount !== null) {
    return {
      title: `How to Pay Off ${money(debtAmount)} in Debt - Payoff Time & Interest by Payment`,
      description: `See exactly how many months it takes to pay off ${money(debtAmount)} in debt and how much interest you'll pay, compared across several realistic monthly payment amounts.`,
      alternates: { canonical: `/${pseoSlug}` },
    }
  }

  return {}
}

function nearbyAmounts(amount: number, all: number[]): { prev: number | null; next: number | null } {
  const idx = all.indexOf(amount)
  return {
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null,
  }
}

function FaqSchema({ items }: { items: Array<{ q: string; a: string }> }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  }
  return (
    <script
      type="application/ld+json"
      // Structured data must be inline JSON, not user input -- safe from XSS.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

function SalaryPage({ amount }: { amount: number }) {
  const data = getSalaryPageData(amount)
  if (!data) notFound()
  const { breakdown, split, recommendedHousing, payoffExample } = data
  const { prev, next } = nearbyAmounts(amount, SALARY_AMOUNTS)

  const faqs = [
    {
      q: `What is the take-home pay for a ${money(amount)} salary?`,
      a: `After estimated federal tax, Social Security, and Medicare, a ${money(amount)} salary comes out to roughly ${money(breakdown.netMonthly)} per month, or ${money(breakdown.netBiweekly)} per biweekly paycheck.`,
    },
    {
      q: `How much of a ${money(amount)} salary goes to taxes?`,
      a: `Around ${money(breakdown.totalTax)} per year (about ${breakdown.effectiveTaxRate}% of gross pay) between federal income tax, Social Security, and Medicare, assuming a single filer taking the standard deduction with no state income tax.`,
    },
    {
      q: `How much rent or mortgage can I afford on ${money(amount)} a year?`,
      a: `Using the common rule of spending no more than 30% of gross monthly income on housing, that's about ${money(recommendedHousing)} per month on a ${money(amount)} salary.`,
    },
    {
      q: `How much should I save or put toward debt each month on ${money(amount)}?`,
      a: `Following the 50/30/20 rule (50% needs, 30% wants, 20% savings and extra debt payments) on take-home pay, that's about ${money(split.savingsAndDebt)} per month toward savings and debt on a ${money(amount)} salary.`,
    },
  ]

  return (
    <div className="min-h-screen bg-[#020617] py-12 text-white">
      <FaqSchema items={faqs} />
      <div className="mx-auto max-w-3xl px-6">
        <Link href="/budget-by-salary" className="text-sm font-semibold text-emerald-400 hover:underline">
          &larr; All salary budgets
        </Link>
        <h1 className="mb-2 mt-4 text-4xl font-bold">Budget on a {money(amount)} Salary</h1>
        <p className="mb-8 text-gray-400">
          Real take-home pay, a 50/30/20 monthly budget, and a debt payoff example for a {money(amount)} annual
          salary.
        </p>

        {/* Take-home pay */}
        <section className="mb-8 rounded-2xl border border-gray-800 bg-[#0f172a] p-6">
          <h2 className="mb-4 text-xl font-bold">Estimated take-home pay</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-gray-400">Per year</p>
              <p className="text-2xl font-bold text-emerald-400">{money(breakdown.netAnnual)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Per month</p>
              <p className="text-2xl font-bold text-emerald-400">{money(breakdown.netMonthly)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Per biweekly paycheck</p>
              <p className="text-2xl font-bold text-emerald-400">{money(breakdown.netBiweekly)}</p>
            </div>
          </div>

          <table className="mt-6 w-full text-sm">
            <tbody>
              <tr className="border-t border-gray-800">
                <td className="py-2 text-gray-400">Gross annual pay</td>
                <td className="py-2 text-right font-semibold">{money(breakdown.grossAnnual)}</td>
              </tr>
              <tr className="border-t border-gray-800">
                <td className="py-2 text-gray-400">Estimated federal income tax</td>
                <td className="py-2 text-right font-semibold">-{money(breakdown.federalTax)}</td>
              </tr>
              <tr className="border-t border-gray-800">
                <td className="py-2 text-gray-400">Social Security (6.2%)</td>
                <td className="py-2 text-right font-semibold">-{money(breakdown.socialSecurity)}</td>
              </tr>
              <tr className="border-t border-gray-800">
                <td className="py-2 text-gray-400">Medicare (1.45%)</td>
                <td className="py-2 text-right font-semibold">-{money(breakdown.medicare)}</td>
              </tr>
              <tr className="border-t border-gray-800">
                <td className="py-2 font-semibold text-white">Net annual pay</td>
                <td className="py-2 text-right font-bold text-emerald-400">{money(breakdown.netAnnual)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-4 text-xs text-gray-500">
            Estimated using 2024 federal tax brackets for a single filer taking the standard deduction, with no state
            income tax and no other deductions or credits. Your actual take-home pay will vary by filing status,
            state, and withholding elections -- use the free{" "}
            <Link href="/calculators/paycheck" className="text-emerald-400 hover:underline">
              paycheck calculator
            </Link>{" "}
            to plug in your own numbers.
          </p>
        </section>

        {/* 50/30/20 budget */}
        <section className="mb-8 rounded-2xl border border-gray-800 bg-[#0f172a] p-6">
          <h2 className="mb-4 text-xl font-bold">Recommended monthly budget (50/30/20 rule)</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-800 p-4">
              <p className="text-sm text-gray-400">Needs (50%)</p>
              <p className="text-2xl font-bold">{money(split.needs)}</p>
              <p className="mt-1 text-xs text-gray-500">Housing, groceries, utilities, minimum debt payments</p>
            </div>
            <div className="rounded-xl border border-gray-800 p-4">
              <p className="text-sm text-gray-400">Wants (30%)</p>
              <p className="text-2xl font-bold">{money(split.wants)}</p>
              <p className="mt-1 text-xs text-gray-500">Dining out, entertainment, subscriptions</p>
            </div>
            <div className="rounded-xl border border-gray-800 p-4">
              <p className="text-sm text-gray-400">Savings &amp; extra debt (20%)</p>
              <p className="text-2xl font-bold">{money(split.savingsAndDebt)}</p>
              <p className="mt-1 text-xs text-gray-500">Emergency fund, retirement, extra debt payments</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            The 30% housing affordability rule suggests spending up to <strong className="text-white">{money(recommendedHousing)}</strong> per
            month on rent or mortgage on a {money(amount)} salary.
          </p>
        </section>

        {/* Debt payoff example */}
        <section className="mb-8 rounded-2xl border border-gray-800 bg-[#0f172a] p-6">
          <h2 className="mb-4 text-xl font-bold">What that budget could do for debt</h2>
          {payoffExample.nonAmortizing ? (
            <p className="text-gray-300">
              Dedicating your {money(payoffExample.extraPayment)}/month savings-and-debt share to a{" "}
              {money(payoffExample.startingBalance)} balance at {payoffExample.apr}% APR isn&apos;t quite enough to
              make progress on its own -- it would need to be paired with the balance&apos;s own minimum payment.
            </p>
          ) : (
            <p className="text-gray-300">
              If you put your entire {money(payoffExample.extraPayment)}/month savings-and-debt share toward a{" "}
              {money(payoffExample.startingBalance)} credit card balance at {payoffExample.apr}% APR (a typical rate),
              you&apos;d be debt-free in about{" "}
              <strong className="text-white">
                {payoffExample.months} month{payoffExample.months === 1 ? "" : "s"}
              </strong>{" "}
              and pay roughly <strong className="text-white">{money(payoffExample.totalInterest)}</strong> in total
              interest.
            </p>
          )}
          <p className="mt-4 text-sm text-gray-400">
            Have a different balance in mind?{" "}
            <Link href="/debt-payoff-plans" className="text-emerald-400 hover:underline">
              See payoff plans by debt amount
            </Link>{" "}
            or run your own numbers in the free{" "}
            <Link href="/calculators/debt-payoff" className="text-emerald-400 hover:underline">
              debt payoff calculator
            </Link>
            .
          </p>
        </section>

        {/* FAQ */}
        <section className="mb-10 rounded-2xl border border-gray-800 bg-[#0f172a] p-6">
          <h2 className="mb-4 text-xl font-bold">Frequently asked questions</h2>
          <div className="space-y-5">
            {faqs.map((f) => (
              <div key={f.q}>
                <p className="font-semibold text-white">{f.q}</p>
                <p className="mt-1 text-sm text-gray-400">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mb-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
          <p className="font-semibold text-white">Want this tracked automatically every paycheck?</p>
          <p className="mt-1 text-sm text-gray-400">
            Paycheck Planner keeps your real budget, bills, and debt payoff plan updated as your numbers change.
          </p>
          <Link
            href="/signup"
            className="mt-4 inline-block rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
          >
            Try Paycheck Planner free
          </Link>
        </div>

        {/* Prev/next salary navigation */}
        <div className="flex items-center justify-between border-t border-gray-800 pt-6 text-sm">
          {prev ? (
            <Link href={`/${salarySlug(prev)}`} className="text-emerald-400 hover:underline">
              &larr; {money(prev)} salary
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/${salarySlug(next)}`} className="text-emerald-400 hover:underline">
              {money(next)} salary &rarr;
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  )
}

function DebtPage({ amount }: { amount: number }) {
  const data = getDebtPageData(amount)
  if (!data) notFound()
  const { scenarios, minimumOnlyPayment } = data
  const { prev, next } = nearbyAmounts(amount, DEBT_AMOUNTS)

  const amortizing = scenarios.filter((s) => !s.nonAmortizing)
  const minimumScenario = scenarios.find((s) => s.monthlyPayment === minimumOnlyPayment)
  const midScenario = amortizing[Math.floor(amortizing.length / 2)] ?? amortizing[0]
  const fastest = amortizing[amortizing.length - 1]
  const slowest = amortizing[0]
  const interestSaved =
    fastest && slowest && fastest !== slowest ? Math.max(0, slowest.totalInterest - fastest.totalInterest) : 0

  const faqs = [
    {
      q: `How long does it take to pay off ${money(amount)} in debt?`,
      a: midScenario
        ? `At ${money(midScenario.monthlyPayment)}/month and an assumed ${ASSUMED_APR}% APR, it takes about ${midScenario.months} months (roughly ${(midScenario.months / 12).toFixed(1)} years) to pay off ${money(amount)} in debt. Paying more each month shortens that significantly -- see the full table above.`
        : `The payoff time depends heavily on your monthly payment and interest rate -- see the payment comparison table above for ${money(amount)} in debt.`,
    },
    {
      q: `How much interest will I pay on ${money(amount)} in credit card debt?`,
      a: minimumScenario && !minimumScenario.nonAmortizing
        ? `Paying only the estimated minimum (about ${money(minimumOnlyPayment)}/month) on ${money(amount)} at ${ASSUMED_APR}% APR would cost roughly ${money(minimumScenario.totalInterest)} in total interest over ${minimumScenario.months} months. Paying more each month cuts that total dramatically.`
        : `At a minimum-only payment, ${money(amount)} at ${ASSUMED_APR}% APR may not amortize at all -- the balance can grow instead of shrinking. Paying more than the minimum each month is what actually brings the balance down.`,
    },
    {
      q: `What is a realistic monthly payment to pay off ${money(amount)}?`,
      a: midScenario
        ? `${money(midScenario.monthlyPayment)}/month is a realistic middle-ground payment for ${money(amount)} in debt, paying it off in about ${midScenario.months} months at an assumed ${ASSUMED_APR}% APR. See the full table above for faster and slower options.`
        : `See the payment comparison table above for realistic monthly payment options on ${money(amount)} in debt.`,
    },
    {
      q: `Does paying more each month really make a big difference on ${money(amount)} in debt?`,
      a: interestSaved > 0 && fastest && slowest
        ? `Yes -- going from ${money(slowest.monthlyPayment)}/month to ${money(fastest.monthlyPayment)}/month on ${money(amount)} in debt saves about ${money(interestSaved)} in interest and finishes ${Math.max(0, slowest.months - fastest.months)} months sooner.`
        : `Yes -- a higher monthly payment always reduces both the payoff time and the total interest paid. See the table above for the exact tradeoff at ${money(amount)}.`,
    },
  ]

  return (
    <div className="min-h-screen bg-[#020617] py-12 text-white">
      <FaqSchema items={faqs} />
      <div className="mx-auto max-w-3xl px-6">
        <Link href="/debt-payoff-plans" className="text-sm font-semibold text-emerald-400 hover:underline">
          &larr; All debt payoff plans
        </Link>
        <h1 className="mb-2 mt-4 text-4xl font-bold">How to Pay Off {money(amount)} in Debt</h1>
        <p className="mb-8 text-gray-400">
          See how long it takes and how much interest you&apos;ll pay on {money(amount)} in debt, compared across
          realistic monthly payment amounts at an assumed {ASSUMED_APR}% APR (a typical credit card rate).
        </p>

        <section className="mb-8 overflow-x-auto rounded-2xl border border-gray-800 bg-[#0f172a] p-6">
          <h2 className="mb-4 text-xl font-bold">Payoff time by monthly payment</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="pb-2">Monthly payment</th>
                <th className="pb-2 text-right">Time to pay off</th>
                <th className="pb-2 text-right">Total interest</th>
                <th className="pb-2 text-right">Total paid</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.monthlyPayment} className="border-t border-gray-800">
                  <td className="py-2">
                    {money(s.monthlyPayment)}
                    {s.monthlyPayment === minimumOnlyPayment && (
                      <span className="ml-2 text-xs text-gray-500">(est. minimum)</span>
                    )}
                  </td>
                  {s.nonAmortizing ? (
                    <td colSpan={3} className="py-2 text-right text-rose-400">
                      Balance grows -- payment doesn&apos;t cover interest
                    </td>
                  ) : s.capped ? (
                    <td colSpan={3} className="py-2 text-right text-amber-400">
                      Over {Math.floor(s.months / 12)} years -- essentially never at this rate
                    </td>
                  ) : (
                    <>
                      <td className="py-2 text-right font-semibold">
                        {s.months} mo ({(s.months / 12).toFixed(1)} yr)
                      </td>
                      <td className="py-2 text-right font-semibold">{money(s.totalInterest)}</td>
                      <td className="py-2 text-right font-semibold">{money(s.totalPaid)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-gray-500">
            Assumes a single balance of {money(amount)} at a constant {ASSUMED_APR}% APR with a fixed monthly payment
            -- your actual rate, fees, and balance changes will affect the real numbers. Use the free{" "}
            <Link href="/calculators/debt-payoff" className="text-emerald-400 hover:underline">
              debt payoff calculator
            </Link>{" "}
            to plug in your own rate and payment.
          </p>
        </section>

        <section className="mb-10 rounded-2xl border border-gray-800 bg-[#0f172a] p-6">
          <h2 className="mb-4 text-xl font-bold">Frequently asked questions</h2>
          <div className="space-y-5">
            {faqs.map((f) => (
              <div key={f.q}>
                <p className="font-semibold text-white">{f.q}</p>
                <p className="mt-1 text-sm text-gray-400">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mb-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
          <p className="font-semibold text-white">Have more than one debt?</p>
          <p className="mt-1 text-sm text-gray-400">
            Paycheck Planner compares Snowball vs. Avalanche across all your real debts and builds your full payoff
            plan automatically.
          </p>
          <Link
            href="/signup"
            className="mt-4 inline-block rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
          >
            Try Paycheck Planner free
          </Link>
        </div>

        <div className="flex items-center justify-between border-t border-gray-800 pt-6 text-sm">
          {prev ? (
            <Link href={`/${debtSlug(prev)}`} className="text-emerald-400 hover:underline">
              &larr; {money(prev)} in debt
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/${debtSlug(next)}`} className="text-emerald-400 hover:underline">
              {money(next)} in debt &rarr;
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  )
}

export default async function ProgrammaticSeoPage({
  params,
}: {
  params: Promise<{ pseoSlug: string }>
}) {
  const { pseoSlug } = await params

  const salaryAmount = parseSalarySlug(pseoSlug)
  if (salaryAmount !== null) return <SalaryPage amount={salaryAmount} />

  const debtAmount = parseDebtSlug(pseoSlug)
  if (debtAmount !== null) return <DebtPage amount={debtAmount} />

  notFound()
}
