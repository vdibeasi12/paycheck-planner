"use client"

// app/components/ThemeProvider.tsx
// Sep 9 2026, Vince: "create a light mode and dark mode so people can choose
// their background." This is the app-wide switch -- it doesn't itself
// restyle any page (that's the semantic tokens in app/globals.css /
// tailwind.config.js, applied page-by-page over the following rounds); it
// owns the light/dark choice, persists it, and sets the data-theme
// attribute every token in globals.css reads.
//
// REVISED same day (Vince): shipped as a three-way Light/Dark/System toggle
// first, but Vince pointed out a straight two-way toggle is all this needs --
// "system" was never a third look, just an auto-picker between the other
// two. Simplified: no separate "system" choice to track or keep in sync with
// the OS live. A first-time visitor with nothing saved yet still gets a
// sensible initial pick from prefers-color-scheme (same as before), it just
// isn't a distinct mode anymore -- the moment they toggle, it's an explicit,
// persisted light/dark choice like everyone else's.
//
// THEME_STORAGE_KEY and resolveInitialTheme are exported so
// app/layout.tsx's no-flash inline script (which has to run before React
// hydrates, as plain JS in a <script> tag, not as a React component) stays
// byte-for-byte in agreement with what this provider does on mount --
// otherwise the very first client render could flip the theme right after
// paint.

import { createContext, useCallback, useContext, useMemo, useState } from "react"

export type ThemeChoice = "light" | "dark"
export type ResolvedTheme = "light" | "dark"

export const THEME_STORAGE_KEY = "pp-theme"

// Kept as a plain string (not a template built from other constants) so it
// can be dropped verbatim into a <script dangerouslySetInnerHTML> in
// app/layout.tsx -- see the comment there. Mirrors resolveInitialTheme
// below exactly: read the saved choice; if nothing's saved yet, pick once
// from prefers-color-scheme, defaulting to 'dark' when that can't be read at
// all (matches this app's dark-only history -- see app/globals.css's :root
// block for the same reasoning). Unchanged by the system-toggle removal --
// this already only ever wrote "light" or "dark" to the attribute.
export const THEME_INIT_SCRIPT = `(function(){try{var k="${THEME_STORAGE_KEY}";var saved=localStorage.getItem(k);var resolved;if(saved==="light"||saved==="dark"){resolved=saved;}else{resolved=(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches)?"light":"dark";}document.documentElement.setAttribute("data-theme",resolved);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`

function systemPrefersLight(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
}

function resolveInitialTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark"
  let saved: string | null = null
  try {
    saved = window.localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    // Private-browsing/storage-blocked -- fall through to the one-time
    // system-preference default below.
  }
  if (saved === "light" || saved === "dark") return saved
  return systemPrefersLight() ? "light" : "dark"
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
  // (the toggle UI, etc).
  const [theme, setThemeState] = useState<ResolvedTheme>(() => resolveInitialTheme())

  const setTheme = useCallback((choice: ThemeChoice) => {
    setThemeState(choice)
    document.documentElement.setAttribute("data-theme", choice)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, choice)
    } catch {
      // Best-effort persistence only -- worst case the choice doesn't
      // survive a reload, it still applies for the rest of this session.
    }
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme: theme, setTheme }),
    [theme, setTheme]
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
