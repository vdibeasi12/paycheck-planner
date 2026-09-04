"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Wallet, PiggyBank, Pencil, ShieldAlert } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { StartingCash, CashAccountRow } from "@/lib/cashBalance"

type Props = {
  startingCash: StartingCash
  savings: CashAccountRow | null
}

function formatAsOf(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function AccountSlot({
  icon,
  title,
  blurb,
  amount,
  asOf,
  asOfHint,
  formatMoney,
  onSave,
}: {
  icon: React.ReactNode
  title: string
  blurb: string
  amount: number | null
  asOf: string | null
  asOfHint: string
  formatMoney: (n: number) => string
  onSave: (amount: number, asOfDate: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [amountText, setAmountText] = useState(amount != null ? String(amount) : "")
  const [dateText, setDateText] = useState(asOf ?? todayISO())

  async function save() {
    const n = Number(amountText)
    if (!Number.isFinite(n) || !dateText) return
    setBusy(true)
    try {
      await onSave(n, dateText)
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          {icon}
          <div>
            <p className="font-semibold text-gray-200">{title}</p>
            {amount != null ? (
              <p className="text-xs text-gray-500">{asOfHint}</p>
            ) : (
              <p className="text-xs text-gray-500">{blurb}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {amount != null && <span className="text-lg font-bold text-gray-100">{formatMoney(amount)}</span>}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            <Pencil size={12} /> {editing ? "Cancel" : amount != null ? "Update" : "Add"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-white/10 pt-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-gray-400">Balance</span>
            <div className="mt-1 flex items-center rounded-lg border border-gray-700 bg-[#1a233a] px-3 focus-within:border-emerald-400">
              <span className="text-gray-300">$</span>
              <input
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="w-full bg-transparent py-2 pl-1 text-sm text-white placeholder-gray-500 outline-none"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs text-gray-400">As of</span>
            <input
              type="date"
              value={dateText}
              onChange={(e) => setDateText(e.target.value)}
              max={todayISO()}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-[#1a233a] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Manual balance entry for Checking and Savings -- the "no Plaid Auth
 * needed" way to ground Safe to Spend/Survival Mode in real money instead
 * of a projected paycheck. Never moves money and never reads a live bank
 * feed: you type in your balance whenever you check your bank, and from
 * that point on Checking keeps itself current on its own by projecting
 * forward through your income/bills/debts (see
 * lib/paycheckCycles.ts's projectRunningBalance) -- so it doesn't quietly
 * go stale the day after you enter it. Savings has no scheduled money
 * moving in or out of it in this app, so it's shown exactly as entered.
 */
export default function CashBalanceEditor({ startingCash, savings }: Props) {
  const router = useRouter()
  const formatMoney = useFormatCurrency()

  async function saveAccount(kind: "checking" | "savings", amount: number, asOfDate: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("cash_accounts").upsert(
      {
        user_id: user.id,
        kind,
        balance: amount,
        balance_as_of: asOfDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,kind" }
    )
    router.refresh()
  }

  const checkingAmount = startingCash.source === "checking" ? startingCash.amount : null
  const checkingAsOfRaw = startingCash.asOf

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-400" />
        <p>
          <span className="font-semibold">Not linked to your bank.</span> These balances are numbers you enter
          yourself -- nothing here reads or moves money in a real account. Checking stays current between updates by
          projecting your income, bills, and debts forward from the date you entered; Savings is shown exactly as you
          left it.
        </p>
      </div>

      <AccountSlot
        icon={<Wallet size={16} className="text-emerald-400 shrink-0" />}
        title="Checking"
        blurb="Add your checking balance so Safe to Spend/Survival Mode start from real money instead of a projection."
        amount={checkingAmount}
        asOf={checkingAsOfRaw}
        asOfHint={
          checkingAsOfRaw === todayISO()
            ? "As of today"
            : `As of ${formatAsOf(checkingAsOfRaw)}, projected to today using your income/bills/debts`
        }
        formatMoney={formatMoney}
        onSave={(amount, asOfDate) => saveAccount("checking", amount, asOfDate)}
      />

      <AccountSlot
        icon={<PiggyBank size={16} className="text-sky-400 shrink-0" />}
        title="Savings"
        blurb="Add your savings balance for visibility -- shown as entered, not projected."
        amount={savings?.balance ?? null}
        asOf={savings?.balance_as_of ?? null}
        asOfHint={`As of ${formatAsOf(savings?.balance_as_of ?? null)}`}
        formatMoney={formatMoney}
        onSave={(amount, asOfDate) => saveAccount("savings", amount, asOfDate)}
      />

      {startingCash.source === "lastPaycheck" && (
        <p className="text-xs text-gray-500">
          No checking balance on file yet -- Safe to Spend is still projecting off your last paycheck.
        </p>
      )}
    </div>
  )
}
