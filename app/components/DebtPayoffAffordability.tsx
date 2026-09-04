'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, AlertTriangle, PiggyBank } from 'lucide-react'
import { useFormatCurrency } from '@/lib/i18n/formatCurrency'
import { computeDebtPayoffAffordability, DEFAULT_PAYOFF_RESERVE } from '@/lib/debtPayoffSafety'
import { excludeTransferCoveredDebts, type CycleBill, type CycleDebt, type CycleIncome, type CycleGoal } from '@/lib/paycheckCycles'

type PayoffDebt = {
  id: string
  name: string
  balance: number
  minimum_payment: number
  due_date: number | null
  grace_period_days: number | null
  paid_through: string | null
  covered_by_transfer: boolean
}

type Props = {
  debts: PayoffDebt[]
  bills: CycleBill[]
  income: CycleIncome[]
  startingCash: number
  todayISO: string
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

/**
 * "Can I pay this off?" -- Sep 4 2026, Vince, after walking through "can I
 * safely use $2,000 to pay off all my credit debt and still be covered for
 * the 15th and 22nd" by hand: "the logic can review and let the person know
 * what they can put towards debt, how much they need to keep in reserve --
 * otherwise they will spend the full $2,781.27 because it's marked safe to
 * spend... A person doesn't want to read everything about their debt, they
 * want to know how much they can give to the debt to get them out of debt.
 * They need to know about a financial cushion."
 *
 * Check which debts you're thinking about paying off in full -- this adds
 * up their real balances and, using the same cycle projection Safe to
 * Spend/Paycheck Shield/"Then what" already run (lib/debtPayoffSafety.ts),
 * says the single number that actually matters: how much is safe to send
 * to debt right now without eating into the cushion you need for what's
 * still coming.
 */
export default function DebtPayoffAffordability({ debts, bills, income, startingCash, todayISO }: Props) {
  const formatMoney = useFormatCurrency()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)

  // A debt only belongs off this checklist if it's ACTUALLY excluded from the
  // affordability math below -- covered_by_transfer alone is no longer
  // trusted without a real transfer on record (see
  // lib/paycheckCycles.ts's excludeTransferCoveredDebts), so this list must
  // agree with what's actually being reserved, not re-read the raw flag.
  const payoffCandidates = useMemo(
    () => excludeTransferCoveredDebts(debts, income),
    [debts, income]
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedDebts = payoffCandidates.filter((d) => selected.has(d.id))
  const payoffCost = selectedDebts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0)

  // Whatever's left still owed after this payoff -- its future minimum
  // payments stop being real obligations once a debt is fully paid off, so
  // they're excluded here rather than just skipped for one cycle.
  const remainingDebts: CycleDebt[] = payoffCandidates
    .filter((d) => !selected.has(d.id))
    .map((d) => ({
      minimum_payment: d.minimum_payment,
      due_date: d.due_date,
      grace_period_days: d.grace_period_days,
      paid_through: d.paid_through,
    }))

  const goals: CycleGoal[] = []
  const affordability = computeDebtPayoffAffordability({
    startingCash,
    income,
    bills,
    debts: remainingDebts,
    goals,
    today: new Date(todayISO + 'T00:00:00'),
  })

  const leftover = affordability.maxSafeToPayoff - payoffCost
  const hasSelection = selectedDebts.length > 0
  const verdict: 'safe' | 'over' | 'none' = !hasSelection ? 'none' : leftover >= 0 ? 'safe' : 'over'

  if (payoffCandidates.length === 0) return null

  return (
    <div className="mb-6 rounded-xl border border-gray-700 bg-[#0f172a] p-5">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <div className="flex items-center gap-2">
          <PiggyBank size={16} className="text-emerald-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Can I pay this off?</h2>
        </div>
        <span className="text-xs text-gray-500">{open ? 'Hide' : 'Check what you’re thinking about paying off'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            {payoffCandidates.map((d) => (
              <label
                key={d.id}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06]"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => toggle(d.id)}
                    className="h-4 w-4 shrink-0 rounded border-gray-600 bg-transparent text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="truncate text-sm font-medium text-white">{d.name}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-gray-200">{formatMoney(d.balance)}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-4">
            {hasSelection && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Paying these off costs</span>
                <span className="font-semibold text-gray-100">{formatMoney(payoffCost)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Safe to put toward debt today</span>
              <span className="text-lg font-bold text-emerald-400">{formatMoney(Math.max(0, affordability.maxSafeToPayoff))}</span>
            </div>

            <p className="text-xs text-gray-500">
              Keeps a {formatMoney(affordability.reserve)} cushion
              {affordability.tightestDate ? (
                <>
                  {' '}
                  for what's still coming through your {formatDate(affordability.tightestDate)} paycheck, the tightest point
                  ahead
                </>
              ) : (
                ' on hand'
              )}
              {' '}-- not the full amount marked safe to spend, so you don't overdraft or get hit with an NSF fee.
            </p>

            {verdict === 'safe' && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>
                  Covered -- paying {selectedDebts.length === 1 ? 'this off' : 'these off'} leaves {formatMoney(leftover)} to
                  spare on top of your cushion.
                </span>
              </div>
            )}
            {verdict === 'over' && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-amber-300">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  This is {formatMoney(-leftover)} more than what's safe right now -- it would eat into the cushion you need
                  for what's still coming. Consider paying off {formatMoney(Math.max(0, affordability.maxSafeToPayoff))} worth
                  instead, or wait for your next paycheck.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
