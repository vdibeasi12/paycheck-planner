"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import FeedbackForm from "./FeedbackForm"

// Trigger now lives in the sidebar ("Feedback" under Account). This widget just
// listens for the "open-feedback" event and renders the modal. No floating button.
export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener("open-feedback", handler)
    return () => window.removeEventListener("open-feedback", handler)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-gray-700 bg-[#020617] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Send us feedback</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="rounded-md p-1 text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <FeedbackForm onDone={() => setOpen(false)} />
      </div>
    </div>
  )
}