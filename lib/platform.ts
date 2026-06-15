// lib/platform.ts
"use client"

import { useEffect, useState } from "react"

/**
 * True when running inside the Capacitor native shell (iOS/Android app),
 * false on the web. The Capacitor bridge injects `window.Capacitor` into the
 * webview even when loading a remote URL.
 *
 * Safe to call in event handlers. For render-time decisions, prefer the
 * `useIsNativeApp` hook to avoid hydration mismatches.
 */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false
  const cap = (window as any).Capacitor
  return !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform())
}

/**
 * Mount-safe platform check.
 * Returns `null` until mounted, then `true` (native) or `false` (web).
 *
 * Gate purchase UI with `if (native !== false) return null` so the App Store
 * never sees an in-app purchase action (Guideline 3.1.1) and there is no
 * server-rendered purchase button.
 */
export function useIsNativeApp(): boolean | null {
  const [native, setNative] = useState<boolean | null>(null)
  useEffect(() => {
    setNative(isNativeApp())
  }, [])
  return native
}
