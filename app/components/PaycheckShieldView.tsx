"use client"

import { Shield, TrendingDown } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { PlanResilienceResult, AccountPlanResilience } from "@/lib/planResilience"
import { capacityForCycle, type CapacityLevel } from "@/lib/paycheckCapacity"
import type { CycleIncome } from "@/lib/paycheckCycles"
import StressTestPanel from "./StressTestPanel"
import StrengthenPaycheckPanel from "./StrengthenPaycheckPanel"

// Paycheck Capacity (Aug 26 2026): a percent-of-paycheck badge alongside the
// dollar cushion this list already showed -- $200 left over reads very
// differently on a $500 paycheck than a $3,000 one, and the badge is meant
// to be the at-a-glance answer to "which of these has room" that the raw
// dollar figures don't give you without doing the division yourself.
const CAPACITY_BADGE: Record<CapacityLevel, { dot: string; text: string; label: string }> = {
  very_tight: { dot: "bg-red-400", text: "text-red-400", label: "Very Tight" },
  moderate: { dot: "bg-amber-400", text: "text-amber-400", label: "Moderate" },
  healthy: { dot: "bg-brand", text: "text-brand", label: "Healthy" },
}

type BillRow = { id: string; name: string; amount: number; due_date: number | null }
type DebtRow = {
  id: string
  name: string
  minimum_payment: number
  due_date: number | null
  grace_period_days?: number | null
  paid_through?: string | null
}

type Props = {
  result: PlanResilienceResult
  bills: BillRow[]
  debts: DebtRow[]
  income: CycleIncome[]
  // CRITICAL FIX (Sep 9 2026, Vince, live screenshot): "Paycheck Shield is
  // still calculating 100% and that's incorrect." When the user has linked
  // bills/debts/income to 2+ checking accounts (same evidence gate as Safe
  // to Spend's own split -- see lib/accountSafeToSpend.ts), the page passes
  // this instead of relying on `result`/`bills`/`debts`/`income` above --
  // one stress-test block per account instead of one pooled block, so a
  // real shortfall isolated to one account (Chime, in Vince's case) can't
  // be averaged away by a healthier one (53rd). Undefined/empty means "not
  // split" -- render `result` as a single pooled block exactly as before.
  accountSections?: AccountPlanResilience<BillRow, DebtRow>[]
  // The combined score when split -- the MINIMUM of each account's own
  // strengthScore, not an average (see lib/planResilience.ts). Ignored
  // when accountSections is absent.
  overallStrengthScore?: number
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function strengthLabel(score: number): { label: string; className: string } {
  if (score >= 80) return { label: "STRONG", className: "text-brand" }
  if (score >= 50) return { label: "OK", className: "text-amber-400" }
  return { label: "VULNERABLE", className: "text-red-400" }
}

// The actual stress-test block -- pulled out so the split rendering below
// can repeat it once per account instead of duplicating the JSX. Identical
// output to what this component always rendered when called once with no
// title.
function PaycheckShieldBlock({
  title,
  result,
  bills,
  debts,
  income,
}: {
  title?: string
  result: PlanResilienceResult
  bills: BillRow[]
  debts: DebtRow[]
  income: CycleIncome[]
}) {
  const formatMoney = useFormatCurrency()

  if (!result.hasPlan) {
    return (
      <div>
        {title && <h2 className="mb-3 text-lg font-semibold text-primary">{title}</h2>}
        <p className="text-muted">
          Add income with a pay date, plus bills and debts linked to this account, to see how this account's plan
          holds up.
        </p>
      </div>
    )
  }

  const strength = strengthLabel(result.strengthScore)
  const upcomingCycles = result.cycles.slice(0, 6)

  return (
    <div className="space-y-6">
      {title && <h2 className="text-lg font-semibold text-primary">{title}</h2>}

      <div className="rounded-2xl border border-default bg-gradient-to-br from-surface to-surface-alt p-6 shadow-lg">
        <div className="flex items-end gap-3">
          <span className="text-5xl font-[700] text-primary">{result.strengthScore}</span>
          <span className="pb-1 text-muted">/ 100</span>
          <span className={`pb-1.5 ml-1 text-sm font-[600] tracking-wide ${strength.className}`}>{strength.label}</span>
        </div>
        <p className="mt-2 text-sm text-muted">
          Based on how {result.scenarioResults.length} common real-life scenarios play out against{" "}
          {title ? "this account's" : "your"} next {upcomingCycles.length} paychecks. Not an industry benchmark --
          just a way to see where the plan has slack and where it doesn't.
        </p>
      </div>

      {result.weakestCycle && (
        <div className="rounded-2xl border border-warning-border bg-warning p-6">
          <div className="flex items-center gap-2 text-warning-heading">
            <TrendingDown size={18} />
            <h3 className="text-sm font-[600] uppercase tracking-wide">Weak point</h3>
          </div>
          <p className="mt-2 text-primary">
            The {formatDate(result.weakestCycle.date)} paycheck has the least room -- expected{" "}
            {formatMoney(result.weakestCycle.amount)}, with {formatMoney(
              result.weakestCycle.billsDue + result.weakestCycle.debtsDue + result.weakestCycle.goalContribution
            )}{" "}
            already committed, leaving{" "}
            <span className={result.weakestCycle.runningBalance >= 0 ? "text-brand" : "text-red-300"}>
              {formatMoney(result.weakestCycle.runningBalance)}
            </span>{" "}
            in the account by then -- this paycheck's own math plus whatever's really left over from before it.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-default bg-surface p-6">
        <h3 className="text-sm font-[600] uppercase tracking-wide text-muted mb-3">Upcoming paychecks</h3>
        <div className="space-y-1.5">
          {upcomingCycles.map((c) => {
            const isWeakest = result.weakestCycle && c.date === result.weakestCycle.date
            const committed = c.billsDue + c.debtsDue + c.goalContribution
            const capacity = capacityForCycle(c)
            const badge = CAPACITY_BADGE[capacity.level]
            return (
              <div
                key={c.date}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  isWeakest ? "bg-amber-500/10 border border-amber-500/20" : ""
                }`}
              >
                <span className="text-emphasis font-medium w-20">{formatDate(c.date)}</span>
                <span className="flex items-center gap-1.5 w-28">
                  <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                  <span className={`text-xs font-[600] ${badge.text}`}>
                    {badge.label} &middot; {capacity.capacityPct}%
                  </span>
                </span>
                <span className="text-secondary flex-1 text-right pr-4">-{formatMoney(committed)} committed</span>
                <span className={`w-24 text-right ${c.cushion >= 0 ? "text-brand font-[600]" : "text-red-400 font-semibold"}`}>
                  {formatMoney(c.cushion)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <StressTestPanel scenarioResults={result.scenarioResults} />

      {result.weakestCycle && (
        <StrengthenPaycheckPanel cycle={result.weakestCycle} bills={bills} debts={debts} income={income} />
      )}
    </div>
  )
}

/**
 * Paycheck Shield -- stress-tests the paycheck plan lib/planResilience.ts
 * already projects from income/bills/debts/goals. The question isn't "how
 * much money do I have," it's "how much can this plan withstand before a
 * specific paycheck comes up short." No bank transaction feed involved.
 */
export default function PaycheckShieldView({ result, bills, debts, income, accountSections, overallStrengthScore }: Props) {
  const isSplit = !!accountSections && accountSections.length > 0

  if (!isSplit && !result.hasPlan) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-light border border-brand-light">
            <Shield size={22} className="text-brand" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-primary">Paycheck Shield</h1>
            <p className="text-sm text-muted">Stress-test your paycheck plan against real life.</p>
          </div>
        </div>
        <p className="mt-8 text-muted">
          Add your income with a pay date, plus your bills and debts, to see how your plan holds up.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-light border border-brand-light">
          <Shield size={22} className="text-brand" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-primary">Paycheck Shield</h1>
          <p className="text-sm text-muted">How strong is your current paycheck plan?</p>
        </div>
      </div>

      {isSplit ? (
        <div className="space-y-10">
          <p className="max-w-2xl text-sm text-muted">
            You've linked bills, debts, or paychecks to more than one checking account, so this is stress-tested
            per account -- a shortfall in one account is never averaged away by a healthier balance sitting in
            another.
          </p>
          {overallStrengthScore != null && (
            <div className="rounded-2xl border border-default bg-gradient-to-br from-surface to-surface-alt p-6 shadow-lg">
              <p className="text-xs font-[600] uppercase tracking-wide text-muted mb-2">Overall (weakest account)</p>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-[700] text-primary">{overallStrengthScore}</span>
                <span className="pb-1 text-muted">/ 100</span>
                <span className={`pb-1.5 ml-1 text-sm font-[600] tracking-wide ${strengthLabel(overallStrengthScore).className}`}>
                  {strengthLabel(overallStrengthScore).label}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                The lower of your two accounts' own scores below, not an average -- money doesn't move between
                accounts on its own, so the plan is only as strong as its weakest one.
              </p>
            </div>
          )}
          {accountSections!.map(({ account, result: accountResult, bills: accountBills, debts: accountDebts, income: accountIncome }) => (
            <PaycheckShieldBlock
              key={account.id}
              title={account.name}
              result={accountResult}
              bills={accountBills}
              debts={accountDebts}
              income={accountIncome}
            />
          ))}
        </div>
      ) : (
        <PaycheckShieldBlock result={result} bills={bills} debts={debts} income={income} />
      )}
    </div>
  )
}
