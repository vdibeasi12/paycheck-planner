"use client"

import Link from "next/link"
import { CreditCard, Home, Car, GraduationCap, Wallet, HelpCircle, ArrowRight, Landmark } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import { debtTypeLabel } from "@/lib/debtTypes"

type Debt = {
  id: string
  name?: string | null
  balance?: number | null
  interest_rate?: number | null
  minimum_payment?: number | null
  debt_type?: string | null
  source?: string | null
}

// Icon per debt type, matching the canonical value/label pairs in
// lib/debtTypes.ts. Falls back to a generic dollar icon for '', 'other', or
// any legacy/unrecognized value.
function iconFor(debtType?: string | null) {
  switch (debtType) {
    case "mortgage":
      return Home
    case "auto":
      return Car
    case "credit_card":
      return CreditCard
    case "student_loan":
      return GraduationCap
    case "personal":
      return Wallet
    default:
      return HelpCircle
  }
}

export default function DebtList({ debts }: { debts: Debt[] | null | undefined }) {
  const formatMoney = useFormatCurrency()
  const safeDebts = Array.isArray(debts) ? debts : []
  // Biggest balance first -- a glanceable "what do I owe the most on" view,
  // separate from the Snowball/Avalanche strategy order on the Debts and
  // Payoff Plan pages.
  const sorted = [...safeDebts].sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0))
  const totalBalance = safeDebts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0)

  return (
    <div className="rounded-xl border border-gray-700 bg-[#0f172a] p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Landmark size={18} className="text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Your Debts</h2>
          {safeDebts.length > 0 && (
            <span className="rounded-full bg-[#1a233a] px-2 py-0.5 text-xs font-medium text-gray-400">
              {safeDebts.length}
            </span>
          )}
        </div>
        <Link
          href="/debts"
          className="flex items-center gap-1 text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          Manage debts <ArrowRight size={14} />
        </Link>
      </div>

      {safeDebts.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-gray-300">No debts added yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Add a debt or connect a credit card to start building your payoff plan.
          </p>
          <Link
            href="/debts"
            className="mt-4 inline-block rounded-lg bg-green-500 px-5 py-2 font-medium text-black transition hover:bg-green-600"
          >
            Add a debt
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {sorted.map((d) => {
              const Icon = iconFor(d.debt_type)
              const pct = totalBalance > 0 ? ((Number(d.balance) || 0) / totalBalance) * 100 : 0
              return (
                <div
                  key={d.id}
                  className="rounded-lg border border-gray-700 bg-[#0b1220] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {d.name || "Unnamed Debt"}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                          <span className="rounded-full bg-[#1a233a] px-2 py-0.5 font-medium text-gray-400">
                            {debtTypeLabel(d.debt_type)}
                          </span>
                          {d.source === "plaid" && (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-400">
                              Synced
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="shrink-0 text-lg font-bold text-rose-400">
                      {formatMoney(Number(d.balance) || 0)}
                    </p>
                  </div>
                  <p className="mt-2.5 text-xs text-gray-500">
                    {Number(d.interest_rate || 0).toFixed(2)}% APR
                    {Number(d.minimum_payment) > 0
                      ? ` - ${formatMoney(Number(d.minimum_payment))}/mo minimum`
                      : ""}
                  </p>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#1a233a]">
                    <div
                      className="h-full rounded-full bg-rose-500/70"
                      style={{ width: `${Math.min(100, Math.max(pct > 0 ? 3 : 0, pct))}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-right text-xs text-gray-500">
            {formatMoney(totalBalance)} total across {safeDebts.length} debt
            {safeDebts.length === 1 ? "" : "s"}
          </p>
        </>
      )}
    </div>
  )
}
