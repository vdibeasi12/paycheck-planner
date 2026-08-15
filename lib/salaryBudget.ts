// lib/salaryBudget.ts
// Real tax/budget math for the salary-based programmatic SEO pages (Task
// #24, app/[pseoSlug]/page.tsx). Deliberately not a thin/templated page --
// every number here is a genuine calculation using the most recent
// finalized full-year IRS figures (2024 single-filer brackets and standard
// deduction) rather than a guessed or placeholder figure. Same "reasonable
// estimate, not a tax return" posture as
// app/components/calculators/PaycheckCalculator.tsx: no state tax, no
// filing-status variation, no itemized deductions -- called out explicitly
// in the page copy as an assumption.

export const STANDARD_DEDUCTION_SINGLE = 14_600 // 2024, single filer
export const SS_WAGE_BASE = 168_600 // 2024 Social Security taxable maximum
export const SS_RATE = 0.062
export const MEDICARE_RATE = 0.0145

// 2024 single-filer marginal brackets: rate applies to income above the
// previous bracket's cap, up to `upTo` (the last bracket's upTo is Infinity).
const FEDERAL_BRACKETS_SINGLE: Array<{ rate: number; upTo: number }> = [
  { rate: 0.1, upTo: 11_600 },
  { rate: 0.12, upTo: 47_150 },
  { rate: 0.22, upTo: 100_525 },
  { rate: 0.24, upTo: 191_950 },
  { rate: 0.32, upTo: 243_725 },
  { rate: 0.35, upTo: 609_350 },
  { rate: 0.37, upTo: Infinity },
]

/** Marginal-bracket federal income tax on the given taxable income (post-deduction). */
export function estimateFederalTax(taxableIncome: number): number {
  let tax = 0
  let lastCap = 0
  for (const bracket of FEDERAL_BRACKETS_SINGLE) {
    if (taxableIncome <= lastCap) break
    const taxableInBracket = Math.min(taxableIncome, bracket.upTo) - lastCap
    tax += taxableInBracket * bracket.rate
    lastCap = bracket.upTo
    if (taxableIncome <= bracket.upTo) break
  }
  return Math.round(tax)
}

export type SalaryBreakdown = {
  grossAnnual: number
  federalTax: number
  socialSecurity: number
  medicare: number
  totalTax: number
  netAnnual: number
  netMonthly: number
  netBiweekly: number
  effectiveTaxRate: number // total tax / gross, as a percent (one decimal)
}

export function estimateSalaryBreakdown(grossAnnual: number): SalaryBreakdown {
  const taxableIncome = Math.max(0, grossAnnual - STANDARD_DEDUCTION_SINGLE)
  const federalTax = estimateFederalTax(taxableIncome)
  const socialSecurity = Math.round(Math.min(grossAnnual, SS_WAGE_BASE) * SS_RATE)
  const medicare = Math.round(grossAnnual * MEDICARE_RATE)
  const totalTax = federalTax + socialSecurity + medicare
  const netAnnual = grossAnnual - totalTax
  return {
    grossAnnual,
    federalTax,
    socialSecurity,
    medicare,
    totalTax,
    netAnnual,
    netMonthly: Math.round((netAnnual / 12) * 100) / 100,
    netBiweekly: Math.round((netAnnual / 26) * 100) / 100,
    effectiveTaxRate: Math.round((totalTax / grossAnnual) * 1000) / 10,
  }
}

export type BudgetSplit = {
  needs: number
  wants: number
  savingsAndDebt: number
}

/** Classic 50/30/20 rule applied to monthly take-home (net) income. */
export function budgetSplit(netMonthly: number): BudgetSplit {
  return {
    needs: Math.round(netMonthly * 0.5),
    wants: Math.round(netMonthly * 0.3),
    savingsAndDebt: Math.round(netMonthly * 0.2),
  }
}

/** The common "30% of gross monthly income" rent/mortgage affordability rule. */
export function recommendedMonthlyHousing(grossAnnual: number): number {
  return Math.round((grossAnnual / 12) * 0.3)
}
