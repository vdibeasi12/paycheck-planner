"use client"

// app/components/ThemeToggle.tsx
// Two-way Light/Dark control, styled to match the existing
// LocaleCurrencySelector widget (same border/bg/text scale, same `inline`
// prop convention) since it sits right next to it in both the desktop
// top-right widget and the mobile sticky header (Sidebar.tsx) and the
// logged-out marketing header (AppNav.tsx via app/layout.tsx).
//
// REVISED Sep 9 2026 (Vince): dropped the third "System" option -- it was
// never a distinct look, just an auto-picker between the other two, and
// having three buttons for two actual outcomes was more than this needed.

import { Sun, Moon } from "lucide-react"
import { useTheme, type ThemeChoice } from "./ThemeProvider"

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
]

export default function ThemeToggle({ inline = false }: { inline?: boolean }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label="Color theme"
      className={`flex items-center gap-0.5 rounded-md border border-default bg-surface-alt p-0.5 ${
        inline ? "" : "self-start"
      }`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={`flex items-center justify-center rounded p-1.5 transition ${
              active ? "bg-green-500/15 text-green-400" : "text-muted hover:text-primary"
            }`}
          >
            <Icon size={14} />
          </button>
        )
      })}
    </div>
  )
}
