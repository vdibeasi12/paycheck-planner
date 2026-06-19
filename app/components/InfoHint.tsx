"use client"

import { useState, useId, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Info } from "lucide-react"

/**
 * Small info icon with a hover/focus/tap tooltip.
 * The tooltip is rendered through a portal to document.body so it can never be
 * clipped by an ancestor with overflow-hidden (e.g. the dashboard cards).
 */
export default function InfoHint({
  text,
  label = "More info",
}: {
  text: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0, above: false })
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const id = useId()

  const position = () => {
    const el = btnRef.current
    if (!el || typeof window === "undefined") return
    const r = el.getBoundingClientRect()
    const width = 224
    const margin = 8
    const above = window.innerHeight - r.bottom < 120
    let left = r.left
    const maxLeft = window.innerWidth - width - margin
    if (left > maxLeft) left = Math.max(margin, maxLeft)
    if (left < margin) left = margin
    const top = above ? r.top - 6 : r.bottom + 6
    setCoords({ top, left, above })
  }

  const show = () => {
    position()
    setOpen(true)
  }
  const hide = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const onMove = () => position()
    window.addEventListener("scroll", onMove, true)
    window.addEventListener("resize", onMove)
    return () => {
      window.removeEventListener("scroll", onMove, true)
      window.removeEventListener("resize", onMove)
    }
  }, [open])

  return (
    <span className="relative inline-flex align-middle">
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        className="inline-flex items-center justify-center rounded-full text-slate-500 transition hover:text-slate-200 focus:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.preventDefault()
          const next = !open
          if (next) position()
          setOpen(next)
        }}
      >
        <Info size={14} />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <span
              id={id}
              role="tooltip"
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                transform: coords.above ? "translateY(-100%)" : "none",
              }}
              className="pointer-events-none z-[1000] w-56 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs leading-relaxed text-slate-200 shadow-xl"
            >
              {text}
            </span>,
            document.body
          )
        : null}
    </span>
  )
}