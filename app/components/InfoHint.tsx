"use client"

import { useState, useId } from "react"
import { Info } from "lucide-react"

/**
 * Small info icon with a hover/focus/tap tooltip.
 * - Hover (mouse) or focus (keyboard) shows the message.
 * - Tap toggles it on touch devices.
 */
export default function InfoHint({
  text,
  label = "More info",
}: {
  text: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        className="inline-flex items-center justify-center rounded-full text-slate-500 transition hover:text-slate-200 focus:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault()
          setOpen((v) => !v)
        }}
      >
        <Info size={14} />
      </button>

      {open && (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute left-0 top-6 z-50 w-56 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs leading-relaxed text-slate-200 shadow-xl"
        >
          {text}
        </span>
      )}
    </span>
  )
}
