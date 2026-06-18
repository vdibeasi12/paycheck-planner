"use client"

import { useState } from "react"
import { ThumbsUp, ThumbsDown, Loader2, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

type Sentiment = "like" | "dislike" | null

export default function FeedbackForm({ onDone }: { onDone?: () => void }) {
  const [sentiment, setSentiment] = useState<Sentiment>(null)
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function submit() {
    if (!message.trim()) return
    setStatus("sending")
    setErrorMsg("")
    try {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth?.user
      if (!user) {
        setStatus("error")
        setErrorMsg("Please sign in to send feedback.")
        return
      }
      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        email: user.email ?? null,
        sentiment,
        message: message.trim(),
      })
      if (error) {
        setStatus("error")
        setErrorMsg("Could not send feedback. Please try again.")
        return
      }
      setStatus("done")
      setMessage("")
      setSentiment(null)
      if (onDone) setTimeout(onDone, 1400)
    } catch {
      setStatus("error")
      setErrorMsg("Could not send feedback. Please try again.")
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <CheckCircle2 className="text-emerald-400" size={32} />
        <p className="font-semibold text-white">Thanks for the feedback!</p>
        <p className="text-sm text-gray-400">It helps us decide what to build next.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm text-gray-300">How is it going?</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSentiment(sentiment === "like" ? null : "like")}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
              sentiment === "like"
                ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                : "border-gray-700 text-gray-300 hover:bg-white/5"
            }`}
          >
            <ThumbsUp size={16} /> Like
          </button>
          <button
            type="button"
            onClick={() => setSentiment(sentiment === "dislike" ? null : "dislike")}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
              sentiment === "dislike"
                ? "border-rose-400 bg-rose-400/10 text-rose-300"
                : "border-gray-700 text-gray-300 hover:bg-white/5"
            }`}
          >
            <ThumbsDown size={16} /> Dislike
          </button>
        </div>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        maxLength={4000}
        placeholder="What do you like, or what would make this better?"
        className="w-full resize-none rounded-lg border border-gray-700 bg-[#0f172a] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
      />

      {status === "error" && <p className="text-sm text-rose-400">{errorMsg}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={status === "sending" || !message.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
      >
        {status === "sending" ? <Loader2 size={16} className="animate-spin" /> : null}
        {status === "sending" ? "Sending..." : "Send feedback"}
      </button>
    </div>
  )
}