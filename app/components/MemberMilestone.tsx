"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"

// Show the real count only once it is substantial. Below this we show an
// invitation instead of a weak number. Bump this up/down as you grow.
const REVEAL_AT = 100
const MILESTONES = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000]

function nextMilestone(n: number): number {
  for (const m of MILESTONES) if (n < m) return m
  return MILESTONES[MILESTONES.length - 1]
}
function passedMilestone(n: number): number {
  let p = MILESTONES[0]
  for (const m of MILESTONES) if (n >= m) p = m
  return p
}

export default function MemberMilestone() {
  const [count, setCount] = useState<number | null>(null)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    let active = true
    supabase.rpc("registered_member_count").then(({ data, error }) => {
      if (!active) return
      setCount(error || typeof data !== "number" ? 0 : data)
    })
    return () => {
      active = false
    }
  }, [])

  const passed = count !== null && count >= MILESTONES[0]
  const target =
    count !== null && count >= REVEAL_AT ? (passed ? passedMilestone(count) : count) : 0

  useEffect(() => {
    if (!target) return
    let raf = 0
    const start = performance.now()
    const dur = 1200
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  const belowReveal = count !== null && count < REVEAL_AT
  const goal = count !== null ? nextMilestone(count) : MILESTONES[0]
  const pct = count !== null ? Math.min(100, Math.round((count / goal) * 100)) : 0

  return (
    <section className="max-w-6xl mx-auto px-6 py-12">
      <div className="rounded-2xl border border-gray-700 bg-gradient-to-r from-green-500/10 to-blue-500/10 px-8 py-10 text-center">
        {count === null ? (
          <p className="text-gray-500">Loading our community...</p>
        ) : belowReveal ? (
          <>
            <h2 className="text-2xl md:text-3xl font-bold">
              Be one of our first{" "}
              <span className="text-green-400">{MILESTONES[0].toLocaleString()}</span> members
            </h2>
            <p className="mt-3 text-gray-300">
              We are just getting started building a debt-free community. Get in early.
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-block rounded-lg bg-green-500 px-6 py-3 font-semibold text-black transition hover:bg-green-600"
            >
              Join Free
            </Link>
          </>
        ) : passed ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-400">
              Growing every day
            </p>
            <h2 className="mt-2 text-4xl md:text-5xl font-bold tabular-nums">
              {shown.toLocaleString()}+
            </h2>
            <p className="mt-2 text-lg text-gray-300">members taking control of their debt</p>
          </>
        ) : (
          <>
            <h2 className="text-3xl md:text-4xl font-bold tabular-nums">
              {shown.toLocaleString()}+ members and counting
            </h2>
            <p className="mt-3 text-gray-400">Help us reach {goal.toLocaleString()}</p>
            <div className="mx-auto mt-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-400 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
      </div>
    </section>
  )
}