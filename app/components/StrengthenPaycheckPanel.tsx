"use client"

import Link from "next/link"
import { Wrench } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import { itemsInCycleWindow } from "@/lib/planResilience"
import type { PaycheckCycle } from "@/lib/paycheckCycles"

type BillRow = { id: string; name: string; amount: number; due_date: number | null }
type DebtRow = { id: string; name: string; minimum_payment: number; due_date: number | null }

type Props = {
  cycle: PaycheckCycle
  bills: BillRow[]
  debts: DebtRow[]
}

/**
 * Preview-only suggestions for the weakest projected paycheck -- each one
 * recalculates what the cushion *would* become, with a link to the real
 * bills/goals screen to actually make the change. Deliberately doesn't
 * mutate anything from here: same pattern as WhatIfSpend, and it avoids a
 * second, parallel path for editing recurring records outside their normal
 * screens. Two suggestions from the original feature pitch are left out for
 * now -- "reduce an extra debt payment" has nothing to attach to (debts only
 * store a minimum_payment; there's no persisted "planned extra" field, only
 * a number typed into the what-if simulators), and "pull buffer from an
 * earlier paycheck" would mean tracking a rolling surplus balance, which
 * this app deliberately doesn't do (same reasoning as Safe-to-Spend not
 * claiming a live balance).
 */
export default function StrengthenPaycheckPanel({ cycle, bills, debts }: Props) {
  const formatMoney = useFormatCurrency()

  if (cycle.cushion >= cycle.amount * 0.2 && cycle.cushion > 0) return null

  const billsInWindow = itemsInCycleWindow(cycle, bills).sort((a, b) => b.amount - a.amount).slice(0, 3)
  const hasGoalContribution = cycle.goalContribution > 0
  const debtsInWindow = itemsInCycleWindow(
    cycle,
    debts.map((d) => ({ ...d, amount: d.minimum_payment }))
  )

  const hasSuggestions = billsInWindow.length > 0 || hasGoalContribution

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0b1220] p-6">
      <div className="flex items-center gap-2 mb-1">
        <Wrench size={16} className="text-emerald-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Strengthen this paycheck</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">Previews only -- nothing changes until you edit it yourself.</p>

      {!hasSuggestions && (
        <p className="text-sm text-gray-400">
          Nothing obvious to shift here -- the shortfall is coming from a debt payment or income itself rather than a
          movable bill or goal contribution.
        </p>
      )}

      <div className="space-y-2">
        {billsInWindow.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-3">
            <div>
              <p className="text-sm text-white">
                Move <span className="font-medium">{b.name}</span> ({formatMoney(b.amount)}) to the next paycheck
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Cushion would become{" "}
                <span className="text-emerald-400">{formatMoney(cycle.cushion + b.amount)}</span>
              </p>
            </div>
            <Link href="/bills" className="text-xs font-semibold text-emerald-400 hover:underline shrink-0 ml-3">
              Edit bill &rarr;
            </Link>
          </div>
        ))}

        {hasGoalContribution && (
          <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-4 py-3">
            <div>
              <p className="text-sm text-white">
                Pause this cycle&apos;s goal contribution ({formatMoney(cycle.goalContribution)})
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Cushion would become{" "}
                <span className="text-emerald-400">{formatMoney(cycle.cushion + cycle.goalContribution)}</span> --
                pushes that goal&apos;s completion out slightly
              </p>
            </div>
            <Link href="/goals" className="text-xs font-semibold text-emerald-400 hover:underline shrink-0 ml-3">
              Edit goals &rarr;
            </Link>
          </div>
        )}
      </div>

      {debtsInWindow.length > 0 && (
        <p className="mt-4 text-xs text-gray-500">
          {formatMoney(cycle.debtsDue)} of this paycheck's commitments is debt minimum payments. Adjusting those
          means revisiting your payoff plan --{" "}
          <Link href="/debts" className="text-emerald-400 hover:underline">
            see your debts
          </Link>
          .
        </p>
      )}
    </div>
  )
}
