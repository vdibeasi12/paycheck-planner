"use client"

import { useEffect, useMemo, useState } from "react"
import { ThumbsUp, ThumbsDown, MessageSquare, Loader2, Check, RotateCcw, Trash2 } from "lucide-react"

type Row = {
  id: string
  created_at: string
  email: string | null
  sentiment: "like" | "dislike" | null
  message: string
  status: "open" | "resolved"
}

type Filter = "all" | "open" | "resolved"

export default function AdminFeedback() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [filter, setFilter] = useState<Filter>("open")
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/feedback")
      .then((r) => (r.ok ? r.json() : { feedback: [] }))
      .then((d) => setRows((d.feedback as Row[]) || []))
      .catch(() => setRows([]))
  }, [])

  const counts = useMemo(() => {
    const all = rows || []
    return {
      all: all.length,
      open: all.filter((r) => r.status !== "resolved").length,
      resolved: all.filter((r) => r.status === "resolved").length,
    }
  }, [rows])

  const shown = useMemo(() => {
    const all = rows || []
    if (filter === "open") return all.filter((r) => r.status !== "resolved")
    if (filter === "resolved") return all.filter((r) => r.status === "resolved")
    return all
  }, [rows, filter])

  async function setStatus(id: string, status: "open" | "resolved") {
    setBusyId(id)
    const prev = rows
    setRows((rs) => (rs || []).map((r) => (r.id === id ? { ...r, status } : r)))
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) setRows(prev)
    } catch {
      setRows(prev)
    } finally {
      setBusyId(null)
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this feedback permanently?")) return
    setBusyId(id)
    const prev = rows
    setRows((rs) => (rs || []).filter((r) => r.id !== id))
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) setRows(prev)
    } catch {
      setRows(prev)
    } finally {
      setBusyId(null)
    }
  }

  const Tab = ({ id, label, n }: { id: Filter; label: string; n: number }) => (
    <button
      type="button"
      onClick={() => setFilter(id)}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        filter === id
          ? "bg-emerald-500/20 text-emerald-300"
          : "bg-[#1a233a] text-gray-400 hover:text-gray-200"
      }`}
    >
      {label} {n}
    </button>
  )

  return (
    <div className="mt-8">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <MessageSquare size={18} className="text-emerald-400" />
        <h2 className="text-lg font-bold text-white">Feedback</h2>
        <div className="ml-2 flex items-center gap-2">
          <Tab id="open" label="Open" n={counts.open} />
          <Tab id="resolved" label="Resolved" n={counts.resolved} />
          <Tab id="all" label="All" n={counts.all} />
        </div>
      </div>

      {rows === null ? (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 size={16} className="animate-spin" /> Loading...
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6 text-center text-gray-400">
          {filter === "resolved"
            ? "Nothing resolved yet."
            : filter === "open"
            ? "No open feedback. Nice."
            : "No feedback yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl border p-4 ${
                r.status === "resolved"
                  ? "border-gray-800 bg-[#0b1322] opacity-75"
                  : "border-gray-700 bg-[#0f172a]"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {r.sentiment === "like" && <ThumbsUp size={15} className="text-emerald-400" />}
                  {r.sentiment === "dislike" && <ThumbsDown size={15} className="text-rose-400" />}
                  <span className="text-sm font-medium text-gray-200">{r.email || "Unknown"}</span>
                  {r.status === "resolved" && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                      Resolved
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-300">{r.message}</p>
              <div className="mt-3 flex items-center gap-2">
                {r.status === "resolved" ? (
                  <button
                    type="button"
                    onClick={() => setStatus(r.id, "open")}
                    disabled={busyId === r.id}
                    className="flex items-center gap-1 rounded-lg border border-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-[#1a233a] disabled:opacity-50"
                  >
                    <RotateCcw size={13} /> Reopen
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStatus(r.id, "resolved")}
                    disabled={busyId === r.id}
                    className="flex items-center gap-1 rounded-lg border border-emerald-500/40 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                  >
                    <Check size={13} /> Mark resolved
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  disabled={busyId === r.id}
                  className="flex items-center gap-1 rounded-lg border border-rose-500/40 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  <Trash2 size={13} /> Delete
                </button>
                {busyId === r.id && <Loader2 size={12} className="animate-spin text-gray-400" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}