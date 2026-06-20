"use client"

import { useState } from "react"
import { MessageSquarePlus, X } from "lucide-react"
import FeedbackForm from "./FeedbackForm"

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-gray-700 bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-gray-100 shadow-lg transition hover:bg-[#1a233a]"
      >
        <MessageSquarePlus size={18} className="text-emerald-400" />
        Feedback
      </button>

      {open && (
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
      )}
    </>
  )
}