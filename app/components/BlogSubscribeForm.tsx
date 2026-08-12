"use client"

import { useState } from "react"
import { Mail, Loader2, Check } from "lucide-react"

export default function BlogSubscribeForm() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (status === "loading") return
    setStatus("loading")
    setErrorMsg("")
    try {
      const res = await fetch("/api/blog/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "public_blog" }),
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
      <div className="rounded-2xl border border-gray-800 bg-[#0f172a] p-6 text-center">
        <Check className="mx-auto mb-2 text-emerald-400" size={24} />
        <p className="font-semibold text-white">You're subscribed</p>
        <p className="mt-1 text-sm text-gray-400">
          We'll email you when a new Financial Hub post goes up.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0f172a] p-6">
      <div className="mb-1 flex items-center gap-2">
        <Mail size={18} className="text-emerald-400" />
        <p className="font-semibold text-white">Get new posts by email</p>
      </div>
      <p className="mb-4 text-sm text-gray-400">
        A quick note whenever a new Financial Hub guide publishes. No spam, unsubscribe anytime.
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
          Subscribe
        </button>
      </form>
      {status === "error" && <p className="mt-2 text-sm text-red-400">{errorMsg}</p>}
    </div>
  )
}
