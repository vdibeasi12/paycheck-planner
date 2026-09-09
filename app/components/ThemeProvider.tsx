"use client"

// app/components/ThemeProvider.tsx
// Sep 9 2026, Vince: "create a light mode and dark mode so people can choose
// their background." This is the app-wide switch -- it doesn't itself
// restyle any page (that's the semantic tokens in app/globals.css /
// tailwind.config.js, applied page-by-page over the following rounds); it
// owns the single "light | dark | system" choice, persists it, and sets the
// data-theme attribute every token in globals.css reads.
//
// THEME_STORAGE_KEY and resolveInitialTheme are exported so
// app/layout.tsx's no-flash inline script (which has to run before React
// hydrates, as plain JS in a <script> tag, not as a React component) stays
// byte-for-byte in agreement with what this provider does on mount --
// otherwise the very first client render could flip the theme right after
// paint.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

export type ThemeChoice = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

export const THEME_STORAGE_KEY = "pp-theme"

// Kept as a plain string (not a template built from other constants) so it
// can be dropped verbatim into a <script dangerouslySetInnerHTML> in
// app/layout.tsx -- see the comment there. Mirrors resolveInitialTheme
// below exactly: read the saved choice, fall back to 'system', resolve
// 'system' via prefers-color-scheme, defaulting to 'dark' when that can't
// be read at all (matches this app's dark-only history -- see
// app/globals.css's :root block for the same reasoning).
export const THEME_INIT_SCRIPT = `(function(){try{var k="${THEME_STORAGE_KEY}";var saved=localStorage.getItem(k);var resolved;if(saved==="light"||saved==="dark"){resolved=saved;}else{resolved=(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches)?"light":"dark";}document.documentElement.setAttribute("data-theme",resolved);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`

function systemPrefersLight(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
}

function resolveInitialTheme(): { choice: ThemeChoice; resolved: ResolvedTheme } {
  if (typeof window === "undefined") return { choice: "system", resolved: "dark" }
  let saved: string | null = null
  try {
    saved = window.localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    // Private-browsing/storage-blocked -- fall through to system default.
  }
  if (saved === "light" || saved === "dark") {
    return { choice: saved, resolved: saved }
  }
  return { choice: "system", resolved: systemPrefersLight() ? "light" : "dark" }
}

type ThemeContextValue = {
  theme: ThemeChoice
  resolvedTheme: ResolvedTheme
  setTheme: (choice: ThemeChoice) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazily resolved on the client only -- the no-flash script in
  // app/layout.tsx has already set the real attribute on <html> before this
  // ever mounts, so there's nothing for the initial render here to get
  // wrong; this just needs to agree with it for subsequent React renders
  // (the toggle UI, etc) and for keeping the attribute in sync afterward.
  const [state, setState] = useState<{ choice: ThemeChoice; resolved: ResolvedTheme }>(() => resolveInitialTheme())

  const applyResolved = useCallback((resolved: ResolvedTheme) => {
    document.documentElement.setAttribute("data-theme", resolved)
  }, [])

  // Keep following the OS setting live while choice === "system".
  useEffect(() => {
    if (state.choice !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: light)")
    const onChange = () => {
      const resolved: ResolvedTheme = mq.matches ? "light" : "dark"
      setState((s) => ({ ...s, resolved }))
      applyResolved(resolved)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [state.choice, applyResolved])

  const setTheme = useCallback(
    (choice: ThemeChoice) => {
      const resolved: ResolvedTheme = choice === "system" ? (systemPrefersLight() ? "light" : "dark") : choice
      setState({ choice, resolved })
      applyResolved(resolved)
      try {
        if (choice === "system") {
          window.localStorage.removeItem(THEME_STORAGE_KEY)
        } else {
          window.localStorage.setItem(THEME_STORAGE_KEY, choice)
        }
      } catch {
        // Best-effort persistence only -- worst case the choice doesn't
        // survive a reload, it still applies for the rest of this session.
      }
    },
    [applyResolved]
  )

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: state.choice, resolvedTheme: state.resolved, setTheme }),
    [state, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used within <ThemeProvider>")
  }
  return ctx
}
