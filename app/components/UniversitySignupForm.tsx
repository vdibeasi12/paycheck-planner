"use client"

import { useState } from "react"
import { GraduationCap, Loader2, Check } from "lucide-react"

export default function UniversitySignupForm({ source }: { source?: string }) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (status === "loading") return
    setStatus("loading")
    setErrorMsg("")
    try {
      const res = await fetch("/api/university/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong")
        setStatus("error")
        return
      }
      setStatus("done")
    } catch {
      setErrorMsg("Something went wrong")
      setStatus("error")
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <Check className="mx-auto mb-2 text-emerald-400" size={24} />
        <p className="font-semibold text-white">You're on the list</p>
        <p className="mt-1 text-sm text-gray-300">
          We'll email you the moment Course 1 launches.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6">
      <div className="mb-1 flex items-center gap-2">
        <GraduationCap size={18} className="text-emerald-400" />
        <p className="font-semibold text-white">Get notified when it launches</p>
      </div>
      <p className="mb-4 text-sm text-gray-400">
        Free, practical lessons on budgeting, debt payoff, and building real financial habits --
        no fluff. Be the first to know when Course 1 drops.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
        >
          {status === "loading" ? <Loader2 size={16} className="animate-spin" /> : null}
          Notify Me
        </button>
      </form>
      {status === "error" && <p className="mt-2 text-sm text-red-400">{errorMsg}</p>}
    </div>
  )
}
