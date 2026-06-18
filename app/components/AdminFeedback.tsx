"use client"

import { useEffect, useState } from "react"
import { ThumbsUp, ThumbsDown, MessageSquare, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

type Row = {
  id: string
  created_at: string
  email: string | null
  sentiment: "like" | "dislike" | null
  message: string
}

export default function AdminFeedback() {
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    supabase
      .from("feedback")
      .select("id, created_at, email, sentiment, message")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setRows((data as Row[]) || []))
  }, [])

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare size={18} className="text-emerald-400" />
        <h2 className="text-lg font-bold text-white">Recent feedback</h2>
        {rows && (
          <span className="rounded-full bg-[#1a233a] px-2 py-0.5 text-xs text-gray-300">
            {rows.length}
          </span>
        )}
      </div>

      {rows === null ? (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 size={16} className="animate-spin" /> Loading...
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6 text-center text-gray-400">
          No feedback yet.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-700 bg-[#0f172a] p-4">
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {r.sentiment === "like" && <ThumbsUp size={15} className="text-emerald-400" />}
                  {r.sentiment === "dislike" && <ThumbsDown size={15} className="text-rose-400" />}
                  <span className="text-sm font-medium text-gray-200">{r.email || "Unknown"}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-300">{r.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}