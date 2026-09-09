"use client"

import Link from "next/link"
import { ArrowLeft, LifeBuoy } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { SafeToSpendResult } from "@/lib/safeToSpend"
import type { ClassifiedItem } from "@/lib/paycheckCycles"
import type { NearTermRisk, UpcomingCycleForecast } from "@/lib/planResilience"
import type { StartingCash, ProjectedCashAccountRow, CashAccountRow } from "@/lib/cashBalance"
import WhatIfSpend from "./WhatIfSpend"
import PlanRiskBanner from "./PlanRiskBanner"
import CashBalanceEditor from "./CashBalanceEditor"
import PaycheckItemBreakdown from "./PaycheckItemBreakdown"
import PaycheckLookahead from "./PaycheckLookahead"

type NamedBill = { id: string; name: string; amount: number; due_date: number | null }
type NamedDebt = { id: string; name: string; minimum_payment: number; due_date: number | null }
type NamedClassifiedDebt = ClassifiedItem<{ id: string; name: string; amount: number; due_date: number | null }>

// One checking account's own Safe-to-Spend numbers, for the per-account
// split (Sep 9 2026, Vince) -- see AccountSafeToSpendBlock below.
export type SurvivalModeAccountSection = {
  account: CashAccountRow
  result: SafeToSpendResult
  classifiedBills: ClassifiedItem<NamedBill>[]
  classifiedDebts: NamedClassifiedDebt[]
  coveredDebts?: { name: string; amount: number }[]
}

type Props = {
  result: SafeToSpendResult
  startingCash: StartingCash
  accounts: ProjectedCashAccountRow[]
  classifiedBills: ClassifiedItem<NamedBill>[]
  classifiedDebts: NamedClassifiedDebt[]
  coveredDebts?: { name: string; amount: number }[]
  risk: NearTermRisk | null
  lookahead?: UpcomingCycleForecast[]
  // Sep 9 2026, Vince: "53rd only gets $1660 per paycheck to save and pay
  // [mortgage/car/personal loan]... Chime gets the rest to pay utilities
  // and credit cards. If I spend all that [pooled] money I will not have
  // enough..." When the user has linked bills/debts/income to 2+ checking
  // accounts, the page passes this instead of relying on `result` above --
  // one Safe-to-Spend block per account instead of one pooled block, so
  // money reserved for one account's bills is never shown as safe to spend
  // out of another. Undefined/empty means "not split" -- render `result` as
  // a single pooled block exactly as this component always has.
  accountSections?: SurvivalModeAccountSection[]
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "green" | "red" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${
          accent === "green" ? "text-emerald-400" : accent === "red" ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

// The actual "here's your money" block -- pulled out so the split rendering
// below can repeat it once per account instead of duplicating the JSX.
// Identical output to what this component always rendered when called once
// with no title.
function AccountSafeToSpendBlock({
  title,
  result,
  classifiedBills,
  classifiedDebts,
  coveredDebts = [],
}: {
  title?: string
  result: SafeToSpendResult
  classifiedBills: ClassifiedItem<NamedBill>[]
  classifiedDebts: NamedClassifiedDebt[]
  coveredDebts?: { name: string; amount: number }[]
}) {
  const formatMoney = useFormatCurrency()

  // See PaycheckCountdown.tsx's matching comment -- CRITICAL FIX (Sep 9 2026,
  // Vince, reviewing a live screenshot): this used to be excluded from
  // "Safe to spend" above and only shown as a warning, which was a
  // self-contradiction -- these items are unpaid (paid_through already
  // excludes anything actually marked paid), so the money hasn't left yet
  // and Safe to Spend above now reserves it directly (see
  // lib/safeToSpend.ts).
  //
  // SECOND FIX, same day (Vince caught this too, from the next screenshot):
  // once reserved correctly, this still showed the already-due amount in a
  // SEPARATE breakdown list with its own separate total, so "Still to come
  // before payday"'s own list total no longer matched what "Still due
  // before payday" (the Stat above) actually summed. One combined list now
  // -- `allCommittedItems` -- with `pastDue` as a per-item flag instead of a
  // second bucket, so the list's total always equals the Stat exactly.
  const pastDueTotal = [...classifiedBills, ...classifiedDebts]
    .filter((i) => i.itemStatus === "alreadyDue")
    .reduce((sum, i) => sum + i.amount, 0)
  const allCommittedItems = [...classifiedBills, ...classifiedDebts].map((i) => ({
    name: i.name,
    amount: i.amount,
    date: i.occurrenceDate,
    pastDue: i.itemStatus === "alreadyDue",
  }))

  return (
    <div className="space-y-4">
      {title && <h2 className="text-base font-semibold text-white">{title}</h2>}

      {result.startingCashSource === "lastPaycheck" && result.transfersOut > 0 && (
        <p className="text-xs text-gray-500">
          Your last paycheck ({formatMoney(result.lastPaycheckAmount)}) minus an automatic transfer out (
          {formatMoney(result.transfersOut)}) = {formatMoney(result.startingCash)} starting cash.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Starting cash" value={formatMoney(result.startingCash)} />
        <Stat
          label="Days until payday"
          value={result.daysUntilNextPaycheck === 0 ? "Today" : String(result.daysUntilNextPaycheck)}
        />
        <Stat label="Still due before payday" value={formatMoney(result.billsDue + result.debtsDue + result.goalContribution)} />
        <Stat
          label="Safe to spend"
          value={formatMoney(result.safeToSpend)}
          accent={result.safeToSpend >= 0 ? "green" : "red"}
        />
      </div>

      {result.dailyLimit != null && result.daysUntilNextPaycheck != null && result.daysUntilNextPaycheck > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
          <span className="text-sm font-semibold text-emerald-200">Daily limit</span>
          <span className={`text-2xl font-bold ${result.safeToSpend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatMoney(result.dailyLimit)}/day
          </span>
        </div>
      )}

      {pastDueTotal > 0 && (
        <p className="rounded-lg bg-warning px-4 py-3 text-sm text-warning-heading">
          {formatMoney(pastDueTotal)} of "Still due before payday" above is already past due and unpaid -- it's
          included once, not an extra deduction. Marked "Past due" in the list below.
        </p>
      )}

      {allCommittedItems.length > 0 && (
        <PaycheckItemBreakdown
          title="Still due before payday"
          hint='All unpaid bills and debt payments are included above once. Items marked "Past due" already passed their due date and still need to be paid -- they are not a second deduction.'
          items={allCommittedItems}
          defaultOpen
        />
      )}

      {coveredDebts.length > 0 && (
        <PaycheckItemBreakdown
          title="Covered by an automatic transfer"
          hint="Paid from a linked account this paycheck automatically sweeps money to -- not part of what's subtracted above, so it's not double-counted."
          items={coveredDebts}
        />
      )}
    </div>
  )
}

/**
 * The "survive until payday" mode -- same Safe-to-Spend numbers as the
 * Dashboard's Paycheck Countdown card, but with room to actually show its
 * work: what's already accounted for, what's still coming, an optional
 * real-balance grounding, and a heads-up when Paycheck Shield's own
 * projection sees trouble coming soon.
 */
export default function SurvivalModeView({
  result,
  startingCash,
  accounts,
  classifiedBills,
  classifiedDebts,
  coveredDebts = [],
  risk,
  lookahead = [],
  accountSections,
}: Props) {
  const isSplit = !!accountSections && accountSections.length > 0
  const cantProject = !isSplit && (!result.hasIncome || result.missingPayDate || !result.nextPaycheckDate)

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30">
          <LifeBuoy size={22} className="text-red-400" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">Survival Mode</h1>
          <p className="text-sm text-gray-400">Just the numbers you need until your next paycheck.</p>
        </div>
      </div>

      {cantProject ? (
        <p className="mt-8 text-gray-400">
          Add your income with a pay date, plus your bills and debts, to see your survival numbers here.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {risk && <PlanRiskBanner risk={risk} />}

          <CashBalanceEditor startingCash={startingCash} accounts={accounts} />

          {isSplit ? (
            <div className="space-y-8">
              <p className="text-sm text-gray-400">
                You've linked bills, debts, or paychecks to more than one checking account, so this is split by
                account below -- money reserved for one account's bills is never counted as safe to spend out of
                another.
              </p>
              {accountSections!.map((s) => (
                <AccountSafeToSpendBlock
                  key={s.account.id}
                  title={s.account.name}
                  result={s.result}
                  classifiedBills={s.classifiedBills}
                  classifiedDebts={s.classifiedDebts}
                  coveredDebts={s.coveredDebts}
                />
              ))}
            </div>
          ) : (
            <AccountSafeToSpendBlock
              result={result}
              classifiedBills={classifiedBills}
              classifiedDebts={classifiedDebts}
              coveredDebts={coveredDebts}
            />
          )}

          <PaycheckLookahead forecast={lookahead} />

          {/* WhatIfSpend reasons against ONE pooled Safe to Spend number --
              not yet account-aware, so it's hidden rather than shown against
              a number that's wrong for a split household, once split. */}
          {!isSplit && (
            <div>
              <WhatIfSpend result={result} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
