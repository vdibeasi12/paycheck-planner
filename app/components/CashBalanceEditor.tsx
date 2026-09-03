"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Wallet, Pencil } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import type { StartingCash } from "@/lib/cashBalance"

type Props = {
  startingCash: StartingCash
}

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/**
 * Read-only balance visibility for Safe to Spend/Survival Mode -- never
 * moves money, just lets the number be grounded in something more real than
 * a projected "last paycheck" figure. Two ways in: type a balance in
 * yourself whenever you check your bank, or link an account you've already
 * imported a statement for (same mechanism as a linked savings Goal) so it
 * updates itself from real transaction history. See lib/cashBalance.ts.
 */
export default function CashBalanceEditor({ startingCash }: Props) {
  const router = useRouter()
  const formatMoney = useFormatCurrency()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<"manual" | "linked">(
    startingCash.source === "linkedAccount" ? "linked" : "manual"
  )
  const [manualAmount, setManualAmount] = useState(
    startingCash.source === "manualBalance" ? String(startingCash.amount) : ""
  )
  const [accountLabels, setAccountLabels] = useState<string[]>([])
  const [linkLabel, setLinkLabel] = useState(startingCash.source === "linkedAccount" ? startingCash.label ?? "" : "")
  const [linkStart, setLinkStart] = useState("0")

  useEffect(() => {
    if (!editing) return
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

      const { data: row } = await supabase
        .from("cash_balance")
        .select("linked_starting_balance")
        .eq("user_id", user.id)
        .maybeSingle()
      if (row?.linked_starting_balance != null) setLinkStart(String(row.linked_starting_balance))
    })()
  }, [editing])

  async function save() {
    setBusy(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      if (mode === "manual") {
        const amount = Number(manualAmount)
        if (!Number.isFinite(amount)) return
        await supabase.from("cash_balance").upsert(
          {
            user_id: user.id,
            manual_balance: amount,
            manual_balance_updated_at: new Date().toISOString(),
            linked_account_label: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
      } else {
        if (!linkLabel) return
        await supabase.from("cash_balance").upsert(
          {
            user_id: user.id,
            linked_account_label: linkLabel,
            linked_starting_balance: Number(linkStart) || 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
      }
      setEditing(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function clear() {
    setBusy(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      await supabase
        .from("cash_balance")
        .upsert(
          {
            user_id: user.id,
            manual_balance: null,
            manual_balance_updated_at: null,
            linked_account_label: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
      setEditing(false)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const sourceLine =
    startingCash.source === "linkedAccount"
      ? `Starting from your "${startingCash.label}" imported balance`
      : startingCash.source === "manualBalance"
        ? `Starting from the balance you entered${startingCash.label ? " on " + formatUpdatedAt(startingCash.label) : ""}`
        : "Starting from your last paycheck (add your real balance for more accuracy)"

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Wallet size={15} className="text-emerald-400 shrink-0" />
          <span>{sourceLine} &middot; {formatMoney(startingCash.amount)}</span>
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
        >
          <Pencil size={12} /> {editing ? "Cancel" : "Update"}
        </button>
      </div>

      {editing && (
        <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                mode === "manual" ? "bg-emerald-500 text-black" : "bg-white/5 text-gray-300"
              }`}
            >
              Type in a balance
            </button>
            <button
              type="button"
              onClick={() => setMode("linked")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                mode === "linked" ? "bg-emerald-500 text-black" : "bg-white/5 text-gray-300"
              }`}
            >
              Link an imported account
            </button>
          </div>

          {mode === "manual" ? (
            <label className="block">
              <span className="text-xs text-gray-400">Current balance</span>
              <div className="mt-1 flex items-center rounded-lg border border-gray-700 bg-[#1a233a] px-3 focus-within:border-emerald-400">
                <span className="text-gray-300">$</span>
                <input
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-full bg-transparent py-2 pl-1 text-sm text-white placeholder-gray-500 outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Just for visibility -- this never moves money, and you'll want to update it whenever you check your
                real balance.
              </p>
            </label>
          ) : (
            <>
              <label className="block">
                <span className="text-xs text-gray-400">Account</span>
                <select
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
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
              {linkLabel && (
                <label className="block">
                  <span className="text-xs text-gray-400">
                    Starting balance (what was in &quot;{linkLabel}&quot; before your earliest imported transaction)
                  </span>
                  <div className="mt-1 flex items-center rounded-lg border border-gray-700 bg-[#1a233a] px-3 focus-within:border-emerald-400">
                    <span className="text-gray-300">$</span>
                    <input
                      value={linkStart}
                      onChange={(e) => setLinkStart(e.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                      className="w-full bg-transparent py-2 pl-1 text-sm text-white placeholder-gray-500 outline-none"
                    />
                  </div>
                </label>
              )}
            </>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
            >
              Save
            </button>
            {startingCash.source !== "lastPaycheck" && (
              <button
                type="button"
                disabled={busy}
                onClick={clear}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5"
              >
                Clear (use last paycheck instead)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
