"use client"

import { useCallback, useEffect, useState } from "react"
import { Landmark, RefreshCw, Loader2, Unplug, Wallet } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import PlaidConnectButton from "@/components/PlaidConnectButton"

type Bank = {
  item_id: string
  institution_name: string | null
  status: string | null
  updated_at: string | null
  accounts: number
}

type BankAsset = {
  id: string
  name: string
  asset_type: string | null
  value: number
}

type Msg = { kind: "ok" | "err"; text: string } | null

export default function ConnectedBankAccounts() {
  const formatMoney = useFormatCurrency()
  const [eligible, setEligible] = useState<boolean | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [banks, setBanks] = useState<Bank[]>([])
  const [assets, setAssets] = useState<BankAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyItem, setBusyItem] = useState<string | null>(null)
  const [msg, setMsg] = useState<Msg>(null)

  const load = useCallback(async () => {
    try {
      const [itemsRes, assetsRes] = await Promise.all([
        fetch("/api/plaid/items?product=auth"),
        supabase.from("assets").select("id, name, asset_type, value").eq("source", "plaid"),
      ])
      const itemsData = await itemsRes.json().catch(() => ({}))
      setEligible(!!itemsData?.eligible)
      setEnabled(!!itemsData?.enabled)
      setBanks(Array.isArray(itemsData?.items) ? itemsData.items : [])
      setAssets(assetsRes.data ? (assetsRes.data as BankAsset[]) : [])
    } catch {
      setEligible(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totalBalance = assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0)

  async function refresh() {
    setRefreshing(true)
    setMsg(null)
    try {
      const res = await fetch("/api/plaid/sync", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ kind: "err", text: data?.error || "Couldn't refresh." })
      } else {
        setMsg({ kind: "ok", text: "Refreshed " + (data.items ?? 0) + " connection(s)." })
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
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-5">
        <div className="flex items-center gap-2 text-gray-400">
          <Wallet size={16} className="text-emerald-400" />
          <span className="text-xs font-medium uppercase tracking-wide">Total balance</span>
        </div>
        <p className="mt-2 text-2xl font-bold text-white">{formatMoney(totalBalance)}</p>
        <p className="text-sm text-gray-400">
          across {assets.length} connected account{assets.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Landmark size={20} className="text-emerald-500" />
          <h2 className="text-lg font-semibold text-white">Connected bank accounts</h2>
        </div>
        <p className="mt-1 text-sm text-gray-400">
          Link a checking or savings account to track its balance automatically. Synced balances
          count toward your net worth.
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
                    {b.status && b.status !== "active" ? " - " + b.status : ""}
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

        {assets.length > 0 && (
          <ul className="mt-4 space-y-2">
            {assets.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between border-b border-gray-800 pb-2 last:border-0 last:pb-0"
              >
                <span className="text-sm text-gray-200">
                  {a.name}
                  {a.asset_type && <span className="ml-2 text-xs text-gray-500">{a.asset_type}</span>}
                </span>
                <span className="text-sm font-medium text-white">
                  {formatMoney(Number(a.value) || 0)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PlaidConnectButton purpose="bank" onLinked={load} label="Connect bank account" />
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
              Refresh balances
            </button>
          )}
        </div>

        {!enabled && (
          <p className="mt-3 text-xs text-gray-500">
            Bank syncing is being finalized and will be available shortly.
          </p>
        )}
        {banks.length === 0 && enabled && (
          <p className="mt-3 text-xs text-gray-500">No bank accounts connected yet.</p>
        )}
        {msg && (
          <p className={"mt-3 text-sm " + (msg.kind === "ok" ? "text-emerald-400" : "text-rose-400")}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  )
}