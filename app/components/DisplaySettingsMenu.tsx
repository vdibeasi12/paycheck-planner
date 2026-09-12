"use client"

// app/components/DisplaySettingsMenu.tsx
//
// Theme + language + currency, as one control that fits on a phone.
//
// Sep 12 2026, reported by Vince with a photo of the login screen on a Galaxy:
// the "Log In" button was sliced in half by the right edge of the screen. Both
// mobile headers were laying out a row that cannot fit and had no way to
// reflow, because everything in it was fixed-width:
//
//   logged out  (app/layout.tsx):    Logo | theme | language | currency | Pricing | Login
//   logged in   (Sidebar.tsx):       Logo | theme | language | currency | Account | Sign out | Menu
//
// The language <select> alone is 84px and the currency one 64px, plus their
// icons and gaps -- roughly 240px of a 360px screen spent on two dropdowns
// most people set once and never touch again, which pushed the things they
// came for (Log In, the menu) off the edge. Nothing wrapped: the outer header
// had flex-wrap but the inner group did not, so the overflow just clipped.
//
// Below sm this collapses all three into one 38px icon button with a popover.
// At sm and up it renders exactly what was there before, inline, because on a
// wider screen there is room and a visible control beats a hidden one.
//
// Used by BOTH headers so they cannot drift apart again.

import { useEffect, useRef, useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import ThemeToggle from "./ThemeToggle"
import LocaleCurrencySelector from "./LocaleCurrencySelector"
import { useLocale } from "@/lib/i18n/LocaleProvider"

export default function DisplaySettingsMenu() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const { t } = useLocale()

  // Close on outside click or Escape. Both matter on a phone: the popover
  // covers content, and a tap anywhere else is how people expect to dismiss
  // it. Listeners are only attached while it is open.
  useEffect(() => {
    if (!open) return

    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <>
      {/* sm and up: unchanged from what shipped before. */}
      <div className="hidden items-center gap-4 sm:flex">
        <ThemeToggle inline />
        <LocaleCurrencySelector inline />
      </div>

      {/* Below sm: one button. */}
      <div className="relative sm:hidden" ref={wrapRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={t("selector.displaySettings")}
          title={t("selector.displaySettings")}
          className={`rounded-lg p-2 transition ${
            open ? "bg-white/10 text-primary" : "text-secondary hover:text-primary"
          }`}
        >
          <SlidersHorizontal size={20} />
        </button>

        {open && (
          <div
            role="dialog"
            aria-label={t("selector.displaySettings")}
            // right-0 anchors it to the button's right edge so it opens
            // inward and cannot itself run off the screen -- the bug this
            // component exists to fix.
            className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-default bg-surface py-3 shadow-xl"
          >
            <div className="flex items-center justify-between px-3 pb-3">
              <span className="text-[11px] uppercase tracking-wide text-muted">
                {t("selector.theme")}
              </span>
              <ThemeToggle inline />
            </div>
            {/* The non-inline variant is the stacked, full-width one, which is
                what a popover wants -- the inline variant's fixed 84px/64px
                selects are the whole reason the header did not fit. */}
            <LocaleCurrencySelector />
          </div>
        )}
      </div>
    </>
  )
}
