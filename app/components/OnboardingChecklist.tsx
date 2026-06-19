"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

type Step = { key: string; label: string; href: string; done: boolean }

// Setup progress that lives in the sidebar. Steps are derived from real data
// (income / debts / bills rows), so progress persists across sessions with no
// separate state to track. Hides itself once everything is complete.
export default function OnboardingChecklist() {
  const [steps, setSteps] = useState<Step[] | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (active) setSteps([])
        return
      }

      const defs = [
        { key: "income", label: "Add your income", href: "/income", table: "income" },
        { key: "debts", label: "Add a debt", href: "/debts", table: "debts" },
        { key: "bills", label: "Add a bill", href: "/bills", table: "bills" },
      ]

      const out = await Promise.all(
        defs.map(async (d) => {
          const { count } = await supabase
            .from(d.table)
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
          return { key: d.key, label: d.label, href: d.href, done: (count || 0) > 0 }
        })
      )

      if (active) setSteps(out)
    }

    load()
    return () => {
      active = false
    }
  }, [])

  if (!steps || steps.length === 0) return null

  const done = steps.filter((s) => s.done).length
  const total = steps.length
  if (done >= total) return null

  const pct = Math.round((done / total) * 100)

  return (
    <div className="mx-3 mt-2 rounded-xl border border-gray-800 bg-[#0f172a] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Getting started
        </span>
        <span className="text-xs text-gray-500">
          {done}/{total}
        </span>
      </div>

      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: pct + "%" }}
        />
      </div>

      <ul className="flex flex-col gap-1">
        {steps.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-300 transition hover:bg-white/5"
            >
              <span
                className={
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border " +
                  (s.done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-gray-600 text-transparent")
                }
              >
                <Check size={11} strokeWidth={3} />
              </span>
              <span className={s.done ? "text-gray-500 line-through" : ""}>{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}