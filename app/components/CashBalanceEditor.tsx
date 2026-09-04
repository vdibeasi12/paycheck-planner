"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Wallet, PiggyBank, Pencil, Trash2, Plus, ShieldAlert, X } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import { poolBalance, type StartingCash, type CashAccountRow } from "@/lib/cashBalance"

type Props = {
  startingCash: StartingCash
  accounts: CashAccountRow[]
}

type FormState = { name: string; amount: string; asOf: string }

function formatAsOf(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function emptyForm(): FormState {
  return { name: "", amount: "", asOf: todayISO() }
}

function AccountRow({
  account,
  formatMoney,
  onSave,
  onDelete,
}: {
  account: CashAccountRow
  formatMoney: (n: number) => string
  onSave: (id: string, name: string, amount: number, asOfDate: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<FormState>({
    name: account.name,
    amount: String(account.balance),
    asOf: account.balance_as_of,
  })

  async function save() {
    const n = Number(form.amount)
    if (!Number.isFinite(n) || !form.asOf || !form.name.trim()) return
    setBusy(true)
    try {
      await onSave(account.id, form.name.trim(), n, form.asOf)
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Remove "${account.name}"? This can't be undone.`)) return
    setBusy(true)
    try {
      await onDelete(account.id)
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-white/5 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm text-gray-400">Account name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Chase Checking"
              className="mt-1 w-full rounded-lg border border-gray-700 bg-[#1a233a] px-3 py-2.5 text-base text-white placeholder-gray-500 outline-none focus:border-emerald-400"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-400">Balance</span>
            <div className="mt-1 flex items-center rounded-lg border border-gray-700 bg-[#1a233a] px-3 focus-within:border-emerald-400">
              <span className="text-gray-300">$</span>
              <input
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                inputMode="decimal"
                placeholder="0.00"
                className="w-full bg-transparent py-2.5 pl-1 text-base text-white placeholder-gray-500 outline-none"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-sm text-gray-400">As of</span>
            <input
              type="date"
              value={form.asOf}
              onChange={(e) => setForm((f) => ({ ...f, asOf: e.target.value }))}
              max={todayISO()}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-[#1a233a] px-3 py-2.5 text-base text-white outline-none focus:border-emerald-400"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-red-400 hover:text-red-300 disabled:opacity-60"
          >
            <Trash2 size={14} /> Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-gray-100">{account.name}</p>
        <p className="text-sm text-gray-500">As of {formatAsOf(account.balance_as_of)}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold tabular-nums text-gray-100">{formatMoney(account.balance)}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${account.name}`}
          className="rounded-lg p-2 text-emerald-400 hover:bg-white/5 hover:text-emerald-300"
        >
          <Pencil size={16} />
        </button>
      </div>
    </div>
  )
}

function AddAccountRow({
  kind,
  onAdd,
}: {
  kind: "checking" | "savings"
  onAdd: (name: string, amount: number, asOfDate: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())

  async function save() {
    const n = Number(form.amount)
    if (!Number.isFinite(n) || !form.asOf) return
    setBusy(true)
    try {
      await onAdd(form.name.trim() || (kind === "checking" ? "Checking" : "Savings"), n, form.asOf)
      setForm(emptyForm())
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm font-semibold text-gray-400 hover:border-emerald-400/50 hover:text-emerald-300"
      >
        <Plus size={16} /> Add another {kind === "checking" ? "checking" : "savings"} account
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-300">New {kind} account</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cancel" className="text-gray-500 hover:text-white">
          <X size={16} />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm text-gray-400">Account name</span>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={kind === "checking" ? "e.g. Chase Checking" : "e.g. Emergency Fund"}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-[#1a233a] px-3 py-2.5 text-base text-white placeholder-gray-500 outline-none focus:border-emerald-400"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-400">Balance</span>
          <div className="mt-1 flex items-center rounded-lg border border-gray-700 bg-[#1a233a] px-3 focus-within:border-emerald-400">
            <span className="text-gray-300">$</span>
            <input
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full bg-transparent py-2.5 pl-1 text-base text-white placeholder-gray-500 outline-none"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-sm text-gray-400">As of</span>
          <input
            type="date"
            value={form.asOf}
            onChange={(e) => setForm((f) => ({ ...f, asOf: e.target.value }))}
            max={todayISO()}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-[#1a233a] px-3 py-2.5 text-base text-white outline-none focus:border-emerald-400"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={save}
        className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
      >
        Add account
      </button>
    </div>
  )
}

/**
 * Manual balance entry for Checking and Savings -- the "no Plaid Auth
 * needed" way to ground Safe to Spend/Survival Mode/Paycheck Shield in real
 * money instead of a projected paycheck. Never moves money and never reads
 * a live bank feed: you type in each account's balance whenever you check
 * your bank, and Checking keeps itself current between updates by
 * projecting the pooled total forward through your income/bills/debts (see
 * lib/cashBalance.ts's resolveStartingCash) -- so it doesn't quietly go
 * stale the day after you enter it. Savings has no scheduled money moving
 * in or out of it in this app, so it's pooled and shown exactly as
 * entered. Supports any number of accounts per kind (Sep 4 2026, Vince) --
 * bigger type throughout and a dedicated "Add another account" row per
 * kind replace the old single-slot-per-kind layout.
 */
export default function CashBalanceEditor({ startingCash, accounts }: Props) {
  const router = useRouter()
  const formatMoney = useFormatCurrency()

  const checking = accounts.filter((a) => a.kind === "checking")
  const savings = accounts.filter((a) => a.kind === "savings")

  async function addAccount(kind: "checking" | "savings", name: string, amount: number, asOfDate: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("cash_accounts").insert({
      user_id: user.id,
      kind,
      name,
      balance: amount,
      balance_as_of: asOfDate,
      updated_at: new Date().toISOString(),
    })
    router.refresh()
  }

  async function saveAccount(id: string, name: string, amount: number, asOfDate: string) {
    await supabase
      .from("cash_accounts")
      .update({ name, balance: amount, balance_as_of: asOfDate, updated_at: new Date().toISOString() })
      .eq("id", id)
    router.refresh()
  }

  async function deleteAccount(id: string) {
    await supabase.from("cash_accounts").delete().eq("id", id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 text-sm text-amber-200">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-400" />
        <p>
          <span className="font-semibold">Not linked to your bank.</span> These balances are numbers you enter
          yourself -- nothing here reads or moves money in a real account. All your Checking accounts are pooled
          into one total that stays current between updates by projecting your income, bills, and debts forward;
          Savings accounts are pooled and shown exactly as you left them.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Wallet size={20} className="text-emerald-400 shrink-0" />
            <h3 className="text-lg font-bold text-white">Checking</h3>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-white">{formatMoney(poolBalance(checking))}</p>
            {checking.length > 0 && (
              <p className="text-sm text-gray-500">
                {startingCash.asOf === todayISO()
                  ? "as of today"
                  : `projected to today from ${formatAsOf(startingCash.asOf)}`}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {checking.map((a) => (
            <AccountRow key={a.id} account={a} formatMoney={formatMoney} onSave={saveAccount} onDelete={deleteAccount} />
          ))}
          <AddAccountRow kind="checking" onAdd={(name, amount, asOf) => addAccount("checking", name, amount, asOf)} />
        </div>

        {checking.length === 0 && (
          <p className="mt-2 text-sm text-gray-500">
            Add a checking account so Safe to Spend/Survival Mode/Paycheck Shield start from real money instead of a
            projection.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <PiggyBank size={20} className="text-sky-400 shrink-0" />
            <h3 className="text-lg font-bold text-white">Savings</h3>
          </div>
          <p className="text-2xl font-bold tabular-nums text-white">{formatMoney(poolBalance(savings))}</p>
        </div>

        <div className="mt-3 space-y-2">
          {savings.map((a) => (
            <AccountRow key={a.id} account={a} formatMoney={formatMoney} onSave={saveAccount} onDelete={deleteAccount} />
          ))}
          <AddAccountRow kind="savings" onAdd={(name, amount, asOf) => addAccount("savings", name, amount, asOf)} />
        </div>
      </div>

      {startingCash.source === "lastPaycheck" && (
        <p className="text-sm text-gray-500">
          No checking balance on file yet -- Safe to Spend is still projecting off your last paycheck.
        </p>
      )}
    </div>
  )
}
