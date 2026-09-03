"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Wallet, Pencil, Plus, Trash2, Link2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { StartingCash } from "@/lib/cashBalance"

type Props = {
  startingCash: StartingCash
}

type DraftAccount = {
  id: string | null // null = not yet saved
  label: string
  mode: "manual" | "linked"
  manualAmount: string
  linkLabel: string
  linkStart: string
}

function accountToDraft(a: StartingCash["accounts"][number]): DraftAccount {
  return {
    id: a.id,
    label: a.label,
    mode: a.isLinked ? "linked" : "manual",
    manualAmount: a.isLinked ? "" : String(a.balance),
    linkLabel: a.isLinked ? a.label : "",
    linkStart: "0",
  }
}

/**
 * Read-only balance visibility for Safe to Spend/Survival Mode -- never
 * moves money, just lets the number be grounded in something more real than
 * a projected "last paycheck" figure. A list, not a single number: bills
 * and debts often come out of more than one account (a mortgage from one
 * bank, everyday bills from another), so every account that's actually
 * spendable gets added here and Safe to Spend sums all of them. Leave out
 * dedicated savings/cushion accounts -- link those to a Financial Goal
 * instead so they're tracked as savings, not spendable cash.
 */
export default function CashBalanceEditor({ startingCash }: Props) {
  const router = useRouter()
  const formatMoney = useFormatCurrency()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [drafts, setDrafts] = useState<DraftAccount[]>(startingCash.accounts.map(accountToDraft))
  const [accountLabels, setAccountLabels] = useState<string[]>([])

  useEffect(() => {
    if (!editing) return
    setDrafts(startingCash.accounts.map(accountToDraft))
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("transactions")
        .select("account_label")
        .eq("user_id", user.id)
        .not("account_label", "is", null)
      setAccountLabels(Array.from(new Set((data ?? []).map((r) => r.account_label).filter(Boolean))) as string[])
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  function addDraft() {
    setDrafts((ds) => [
      ...ds,
      { id: null, label: "", mode: "manual", manualAmount: "", linkLabel: "", linkStart: "0" },
    ])
  }

  function updateDraft(idx: number, patch: Partial<DraftAccount>) {
    setDrafts((ds) => ds.map((d, i) => (i === idx ? { ...d, ...patch } : d)))
  }

  function removeDraft(idx: number) {
    setDrafts((ds) => ds.filter((_, i) => i !== idx))
  }

  async function save() {
    setBusy(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const keepIds = drafts.filter((d) => d.id).map((d) => d.id as string)
      const removedIds = startingCash.accounts.map((a) => a.id).filter((id) => !keepIds.includes(id))
      if (removedIds.length > 0) {
        await supabase.from("cash_accounts").delete().in("id", removedIds)
      }

      for (const d of drafts) {
        const label = d.label.trim()
        if (!label) continue
        const row: {
          user_id: string
          label: string
          manual_balance: number | null
          manual_balance_updated_at: string | null
          linked_account_label: string | null
          linked_starting_balance: number
          updated_at: string
        } =
          d.mode === "manual"
            ? {
                user_id: user.id,
                label,
                manual_balance: Number(d.manualAmount) || 0,
                manual_balance_updated_at: new Date().toISOString(),
                linked_account_label: null,
                linked_starting_balance: 0,
                updated_at: new Date().toISOString(),
              }
            : {
                user_id: user.id,
                label,
                manual_balance: null,
                manual_balance_updated_at: null,
                linked_account_label: d.linkLabel || null,
                linked_starting_balance: Number(d.linkStart) || 0,
                updated_at: new Date().toISOString(),
              }
        if (d.id) {
          await supabase.from("cash_accounts").update(row).eq("id", d.id)
        } else {
          await supabase.from("cash_accounts").insert(row)
        }
      }

      setEditing(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const sourceLine =
    startingCash.source === "accounts"
      ? `Starting from ${startingCash.accounts.length === 1 ? `your "${startingCash.label}" balance` : `${startingCash.label}`}`
      : "Starting from your last paycheck (add your real balances for more accuracy)"

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Wallet size={15} className="text-emerald-400 shrink-0" />
          <span>
            {sourceLine} &middot; {formatMoney(startingCash.amount)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
        >
          <Pencil size={12} /> {editing ? "Cancel" : "Manage accounts"}
        </button>
      </div>

      {startingCash.source === "accounts" && startingCash.accounts.length > 1 && !editing && (
        <div className="mt-2 space-y-1 text-xs text-gray-500">
          {startingCash.accounts.map((a) => (
            <div key={a.id} className="flex justify-between">
              <span>{a.label}</span>
              <span>{formatMoney(a.balance)}</span>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="mt-3 space-y-4 border-t border-white/10 pt-3">
          <p className="text-xs text-gray-500">
            Add every account that upcoming bills and debts actually come out of -- Safe to Spend adds them together.
            Leave out savings or a cushion account you're building; link that to a Financial Goal instead so it's
            tracked as savings, not spendable money.
          </p>

          {drafts.map((d, idx) => (
            <div key={idx} className="rounded-lg border border-white/10 bg-[#0f172a] p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={d.label}
                  onChange={(e) => updateDraft(idx, { label: e.target.value })}
                  placeholder="Account name (e.g. Fifth Third Checking)"
                  className="flex-1 rounded-lg border border-gray-700 bg-[#1a233a] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => removeDraft(idx)}
                  className="rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-red-400"
                  aria-label="Remove account"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateDraft(idx, { mode: "manual" })}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    d.mode === "manual" ? "bg-emerald-500 text-black" : "bg-white/5 text-gray-300"
                  }`}
                >
                  Type in a balance
                </button>
                <button
                  type="button"
                  onClick={() => updateDraft(idx, { mode: "linked" })}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    d.mode === "linked" ? "bg-emerald-500 text-black" : "bg-white/5 text-gray-300"
                  }`}
                >
                  <Link2 size={11} className="mr-1 inline" />
                  Link an imported account
                </button>
              </div>

              {d.mode === "manual" ? (
                <label className="block">
                  <span className="text-xs text-gray-400">Current balance</span>
                  <div className="mt-1 flex items-center rounded-lg border border-gray-700 bg-[#1a233a] px-3 focus-within:border-emerald-400">
                    <span className="text-gray-300">$</span>
                    <input
                      value={d.manualAmount}
                      onChange={(e) => updateDraft(idx, { manualAmount: e.target.value })}
                      inputMode="decimal"
                      placeholder="0.00"
                      className="w-full bg-transparent py-2 pl-1 text-sm text-white placeholder-gray-500 outline-none"
                    />
                  </div>
                </label>
              ) : (
                <>
                  <label className="block">
                    <span className="text-xs text-gray-400">Imported account</span>
                    <select
                      value={d.linkLabel}
                      onChange={(e) => updateDraft(idx, { linkLabel: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-700 bg-[#1a233a] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                    >
                      <option value="">Choose an imported account&hellip;</option>
                      {accountLabels.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                    {accountLabels.length === 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        Import a bank statement first (Import page) to get an account to link to.
                      </p>
                    )}
                  </label>
                  {d.linkLabel && (
                    <label className="block">
                      <span className="text-xs text-gray-400">
                        Starting balance (what was in &quot;{d.linkLabel}&quot; before your earliest imported
                        transaction)
                      </span>
                      <div className="mt-1 flex items-center rounded-lg border border-gray-700 bg-[#1a233a] px-3 focus-within:border-emerald-400">
                        <span className="text-gray-300">$</span>
                        <input
                          value={d.linkStart}
                          onChange={(e) => updateDraft(idx, { linkStart: e.target.value })}
                          inputMode="decimal"
                          placeholder="0"
                          className="w-full bg-transparent py-2 pl-1 text-sm text-white placeholder-gray-500 outline-none"
                        />
                      </div>
                    </label>
                  )}
                </>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addDraft}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/20 px-3 py-2 text-xs font-semibold text-gray-300 hover:border-emerald-400 hover:text-emerald-400"
          >
            <Plus size={13} /> Add another account
          </button>

          <div className="flex gap-2">
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
