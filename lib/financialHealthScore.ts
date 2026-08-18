// Shared Financial Health Score engine, used by the Debt Analytics page.
// Pulled out of the component (rather than computed inline) the same way
// lib/payoffSimulate.ts is -- pure, testable, and the one place the formula
// lives so it can't drift between "compute now" and "compute for the delta
// explanation" call sites.
//
// The score is a weighted blend of three sub-scores, each 0-100:
//   - Debt-to-income ratio (monthly debt payments / monthly income) -- 40%
//   - Weighted-average interest rate across active debts -- 30%
//   - Progress paid down since each debt was added (original_balance vs
//     today's balance) -- 30%
// A component is "unavailable" when its underlying data hasn't been entered
// (no income tracked, or no debts with original_balance recorded). When
// that happens the other components' weights are renormalized to still sum
// to 100%, rather than silently scoring the missing piece as 0 or 50 --
// this app tracks a lot of optional data, and this shouldn't punish or
// flatter someone for not having entered it yet.

export type FinancialHealthDebt = {
  balance: number
  original_balance?: number | null
  interest_rate: number
}

export type FinancialHealthInput = {
  debts: FinancialHealthDebt[]
  monthlyDebtPayments: number
  monthlyIncome: number | null
}

export type FinancialHealthComponent = {
  available: boolean
  // Raw metric: DTI and progress are fractions/percents in their natural
  // units (DTI as a 0-1 ratio, progress as a 0-100 percent); APR is a
  // percent (e.g. 12.5). Null when unavailable.
  value: number | null
  subscore: number // 0-100, always defined even when unavailable (0)
  weight: number // the renormalized weight actually used, 0 when unavailable
}

export type FinancialHealthResult = {
  score: number // 0-100, rounded
  debtFree: boolean
  dti: FinancialHealthComponent
  apr: FinancialHealthComponent
  progress: FinancialHealthComponent
}

const BASE_WEIGHTS = { dti: 0.4, apr: 0.3, progress: 0.3 }

// Benchmarks are the standard lender bands for debt-to-income ratio: at or
// under 15% is excellent, 50%+ is the point most lenders consider high-risk.
const DTI_GOOD = 0.15
const DTI_BAD = 0.5

// A 0% APR is as good as it gets; 30%+ covers the worst credit-card penalty
// rates, so it's a reasonable ceiling for "as bad as this gets."
const APR_GOOD = 0
const APR_BAD = 30

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

// Linear map from [good, bad] -> [100, 0], clamped at both ends.
function linearSubscore(value: number, good: number, bad: number): number {
  const t = (value - good) / (bad - good)
  return clamp(100 - t * 100, 0, 100)
}

export function computeFinancialHealthScore(input: FinancialHealthInput): FinancialHealthResult {
  const activeDebts = input.debts.filter((d) => (Number(d.balance) || 0) > 0)

  if (activeDebts.length === 0) {
    // Debt-free is the best possible outcome this score can describe.
    const perfect: FinancialHealthComponent = { available: false, value: null, subscore: 100, weight: 0 }
    return { score: 100, debtFree: true, dti: perfect, apr: perfect, progress: perfect }
  }

  const totalBalance = activeDebts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0)

  // -- Weighted-average APR (identical formula to the Debt Analytics page's
  // own "Avg Interest" stat, so the two numbers can't disagree).
  const weightedApr =
    totalBalance > 0
      ? activeDebts.reduce((sum, d) => sum + (Number(d.balance) || 0) * (Number(d.interest_rate) || 0), 0) /
        totalBalance
      : 0
  const apr: FinancialHealthComponent = {
    available: true,
    value: weightedApr,
    subscore: linearSubscore(weightedApr, APR_GOOD, APR_BAD),
    weight: 0, // filled in after renormalization below
  }

  // -- Debt-to-income ratio.
  const dtiAvailable = input.monthlyIncome != null && input.monthlyIncome > 0
  const dtiRatio = dtiAvailable ? input.monthlyDebtPayments / (input.monthlyIncome as number) : null
  const dti: FinancialHealthComponent = {
    available: dtiAvailable,
    value: dtiRatio,
    subscore: dtiAvailable ? linearSubscore(dtiRatio as number, DTI_GOOD, DTI_BAD) : 0,
    weight: 0,
  }

  // -- Progress paid down since each debt was added. Only debts with
  // original_balance tracked count, same rule as the Debt Analytics page.
  const withOriginal = activeDebts.filter((d) => d.original_balance != null && Number(d.original_balance) > 0)
  const originalTotal = withOriginal.reduce((sum, d) => sum + (Number(d.original_balance) || 0), 0)
  const progressAvailable = withOriginal.length > 0 && originalTotal > 0
  const paidDownTotal = withOriginal.reduce(
    (sum, d) => sum + ((Number(d.original_balance) || 0) - (Number(d.balance) || 0)),
    0
  )
  const progressPct = progressAvailable ? (paidDownTotal / originalTotal) * 100 : null
  const progress: FinancialHealthComponent = {
    available: progressAvailable,
    value: progressPct,
    subscore: progressAvailable ? clamp(progressPct as number, 0, 100) : 0,
    weight: 0,
  }

  // Renormalize weights across whichever components have real data.
  const parts = [
    { key: "dti" as const, comp: dti, base: BASE_WEIGHTS.dti },
    { key: "apr" as const, comp: apr, base: BASE_WEIGHTS.apr },
    { key: "progress" as const, comp: progress, base: BASE_WEIGHTS.progress },
  ]
  const availableBaseSum = parts.reduce((sum, p) => sum + (p.comp.available ? p.base : 0), 0)
  let score = 0
  for (const p of parts) {
    if (!p.comp.available) continue
    const weight = availableBaseSum > 0 ? p.base / availableBaseSum : 0
    p.comp.weight = weight
    score += p.comp.subscore * weight
  }

  return {
    score: Math.round(clamp(score, 0, 100)),
    debtFree: false,
    dti,
    apr,
    progress,
  }
}

export type FinancialHealthSnapshot = {
  score: number | null
  dti: number | null
  avgApr: number | null
  progressPct: number | null
}

export type FinancialHealthDelta = {
  hasPrevious: boolean
  scoreDelta: number
  improved: boolean
  reason: string | null
}

// Compares a freshly computed result against the last snapshot stored on
// the user's profile and produces the "+4 points -- your debt-to-income
// ratio improved" explanation. The driver is whichever available metric
// moved the most in the favorable direction, normalized to a comparable
// 0-1 scale by its own band width -- so a 5-point APR drop and a 5-point
// DTI drop can be compared fairly even though they're different units.
export function diffFinancialHealth(
  current: FinancialHealthResult,
  previous: FinancialHealthSnapshot
): FinancialHealthDelta {
  if (previous.score == null) {
    return { hasPrevious: false, scoreDelta: 0, improved: false, reason: null }
  }

  const scoreDelta = Math.round(current.score - previous.score)
  const improved = scoreDelta > 0
  if (!improved) {
    return { hasPrevious: true, scoreDelta, improved: false, reason: null }
  }

  const candidates: { key: string; normalizedGain: number; reason: string }[] = []

  if (current.dti.available && previous.dti != null) {
    const gain = (previous.dti - (current.dti.value as number)) / (DTI_BAD - DTI_GOOD)
    if (gain > 0) candidates.push({ key: "dti", normalizedGain: gain, reason: "Your debt-to-income ratio improved." })
  }
  if (current.apr.available && previous.avgApr != null) {
    const gain = (previous.avgApr - (current.apr.value as number)) / (APR_BAD - APR_GOOD)
    if (gain > 0) candidates.push({ key: "apr", normalizedGain: gain, reason: "Your average interest rate dropped." })
  }
  if (current.progress.available && previous.progressPct != null) {
    const gain = ((current.progress.value as number) - previous.progressPct) / 100
    if (gain > 0)
      candidates.push({ key: "progress", normalizedGain: gain, reason: "You paid down more of your original balance." })
  }

  candidates.sort((a, b) => b.normalizedGain - a.normalizedGain)
  const reason = candidates.length > 0 ? candidates[0].reason : "Your numbers moved in the right direction."

  return { hasPrevious: true, scoreDelta, improved: true, reason }
}
