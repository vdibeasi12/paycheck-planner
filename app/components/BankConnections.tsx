"use client"

import { useCallback, useEffect, useState } from "react"
import { Landmark, RefreshCw, Loader2, Unplug } from "lucide-react"
import PlaidConnectButton from "@/components/PlaidConnectButton"

type Bank = {
  item_id: string
  institution_name: string | null
  status: string | null
  updated_at: string | null
  accounts: number
}

type Msg = { kind: "ok" | "err"; text: string } | null

export default function BankConnections() {
  const [eligible, setEligible] = useState<boolean | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyItem, setBusyItem] = useState<string | null>(null)
  const [msg, setMsg] = useState<Msg>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/plaid/items")
      const data = await res.json().catch(() => ({}))
      setEligible(!!data?.eligible)
      setEnabled(!!data?.enabled)
      setBanks(Array.isArray(data?.items) ? data.items : [])
    } catch {
      setEligible(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function refresh() {
    setRefreshing(true)
    setMsg(null)
    try {
      const res = await fetch("/api/plaid/sync", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ kind: "err", text: data?.error || "Couldn't refresh." })
      } else {
        setMsg({
          kind: "ok",
          text: `Updated ${data.debts ?? 0} debt(s) from ${data.items ?? 0} bank(s).`,
        })
        await load()
      }
    } catch {
      setMsg({ kind: "err", text: "Couldn't refresh." })
    } finally {
      setRefreshing(false)
    }
  }

  async function disconnect(itemId: string) {
    setBusyItem(itemId)
    setMsg(null)
    try {
      const res = await fetch("/api/plaid/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setMsg({ kind: "err", text: d?.error || "Couldn't disconnect." })
      } else {
        await load()
      }
    } catch {
      setMsg({ kind: "err", text: "Couldn't disconnect." })
    } finally {
      setBusyItem(null)
    }
  }

  if (loading || eligible === null) return null
  if (!eligible) return null

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Landmark size={20} className="text-emerald-500" />
        <h2 className="text-lg font-semibold text-white">Bank connections</h2>
      </div>
      <p className="mt-1 text-sm text-gray-400">
        Link a bank to import your loans and credit cards automatically. Synced
        balances flow into your debts and payoff plan.
      </p>

      {banks.length > 0 && (
        <ul className="mt-4 space-y-2">
          {banks.map((b) => (
            <li
              key={b.item_id}
              className="flex items-center justify-between rounded-lg border border-gray-700 bg-[#0b1220] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {b.institution_name || "Linked bank"}
                </p>
                <p className="text-xs text-gray-400">
                  {b.accounts} account{b.accounts === 1 ? "" : "s"}
                  {b.status && b.status !== "active" ? ` - ${b.status}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {b.status && b.status !== "active" && (
                  <PlaidConnectButton itemId={b.item_id} label="Reconnect" onLinked={load} />
                )}
                <button
                  type="button"
                  onClick={() => disconnect(b.item_id)}
                  disabled={busyItem === b.item_id}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#1a233a] disabled:opacity-60"
                >
                  {busyItem === b.item_id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Unplug size={14} />
                  )}
                  Disconnect
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <PlaidConnectButton onLinked={load} />
        {banks.length > 0 && (
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-[#1a233a] disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh from bank
          </button>
        )}
      </div>

      {!enabled && (
        <p className="mt-3 text-xs text-gray-500">
          Bank syncing is being finalized and will be available shortly.
        </p>
      )}
      {banks.length === 0 && enabled && (
        <p className="mt-3 text-xs text-gray-500">No banks connected yet.</p>
      )}
      {msg && (
        <p
          className={`mt-3 text-sm ${
            msg.kind === "ok" ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  )
}