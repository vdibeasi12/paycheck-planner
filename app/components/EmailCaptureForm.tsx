"use client"

import { useState } from "react"
import { Loader2, Check } from "lucide-react"
import type { LucideIcon } from "lucide-react"

// Shared implementation behind ChallengeSignupForm, UniversitySignupForm,
// BlogSubscribeForm, and WorksheetCaptureForm -- those four were
// near-identical copies (same markup, same fetch/status-machine, only the
// endpoint and copy differed). Consolidated here so a fix (styling, error
// handling, accessibility) only has to happen once. Each of the four files
// now just re-exports this with its own preset copy/endpoint, so every
// existing `<XxxForm />` call site elsewhere in the app keeps working
// unchanged.
//
// Also fixes a real accessibility gap flagged in the Aug 13 audit: none of
// the four originals had a <label> or aria-label on the email input.

export type EmailCaptureFormProps = {
  idPrefix: string
  endpoint: string
  icon: LucideIcon
  heading: string
  description: string
  buttonText: string
  successHeading: string
  successBody: string
  // Extra fields merged into the POST body alongside { email }, e.g.
  // { source: "public_blog" } or { source } for University's per-page source.
  extraBody?: Record<string, unknown>
}

export default function EmailCaptureForm({
  idPrefix,
  endpoint,
  icon: Icon,
  heading,
  description,
  buttonText,
  successHeading,
  successBody,
  extraBody,
}: EmailCaptureFormProps) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (status === "loading") return
    setStatus("loading")
    setErrorMsg("")
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...(extraBody || {}) }),
      })
      const data = await res.json().catch(() => ({}))
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

  const inputId = `${idPrefix}-email`

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <Check className="mx-auto mb-2 text-emerald-400" size={24} />
        <p className="font-semibold text-white">{successHeading}</p>
        <p className="mt-1 text-sm text-gray-300">{successBody}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6">
      <div className="mb-1 flex items-center gap-2">
        <Icon size={18} className="text-emerald-400" />
        <p className="font-semibold text-white">{heading}</p>
      </div>
      <p className="mb-4 text-sm text-gray-400">{description}</p>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className="flex-1 rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
        >
          {status === "loading" ? <Loader2 size={16} className="animate-spin" /> : null}
          {buttonText}
        </button>
      </form>
      {status === "error" && <p className="mt-2 text-sm text-red-400">{errorMsg}</p>}
    </div>
  )
}
