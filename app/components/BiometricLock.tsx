"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { isNativeApp } from "@/lib/platform"
import { getBiometricLockEnabled, verifyBiometric } from "@/lib/biometric"
import { ShieldCheck, Loader2 } from "lucide-react"

/**
 * Mounted once at the app root for logged-in users (see app/layout.tsx).
 * Native-only -- a no-op on the web, so desktop/browser users never see it.
 *
 * If the user opted into the app lock (toggled in Account & security via
 * BiometricLockToggle.tsx), this throws up a full-screen overlay on cold
 * start and every time the app returns from the background, and only
 * reveals the real UI once Face ID / Touch ID / fingerprint (or the device
 * passcode as a fallback) succeeds.
 *
 * Important distinction: this is a device-level convenience & privacy layer
 * -- it protects against someone picking up an already-signed-in phone. It
 * does NOT step up the Supabase session's AAL and is not a substitute for
 * account MFA (see MfaSetup.tsx / the /mfa flow, which remain mandatory for
 * Autopilot regardless of this setting).
 */
export default function BiometricLock() {
  const [enabled, setEnabled] = useState(false)
  const [locked, setLocked] = useState(false)
  const [checking, setChecking] = useState(false)
  const [failed, setFailed] = useState(false)
  const inFlight = useRef(false)

  const attemptUnlock = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setChecking(true)
    setFailed(false)
    const ok = await verifyBiometric("Unlock Paycheck Planner")
    inFlight.current = false
    setChecking(false)
    if (ok) {
      setLocked(false)
    } else {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    if (!isNativeApp()) return
    let cancelled = false
    let removeListener: (() => void) | undefined

    ;(async () => {
      const on = await getBiometricLockEnabled()
      if (cancelled) return
      setEnabled(on)
      if (on) {
        setLocked(true)
        attemptUnlock()
      }

      const { App } = await import("@capacitor/app")
      const handle = await App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) return
        getBiometricLockEnabled().then((stillOn) => {
          if (stillOn) {
            setEnabled(true)
            setLocked(true)
            attemptUnlock()
          }
        })
      })
      if (cancelled) {
        handle.remove()
      } else {
        removeListener = () => handle.remove()
      }
    })()

    return () => {
      cancelled = true
      removeListener?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!enabled || !locked) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617] px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <ShieldCheck size={32} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-semibold text-white">Paycheck Planner is locked</h2>
        <p className="mt-2 text-sm text-gray-400">
          {failed
            ? "Verification didn't go through. Try again."
            : "Verify it's you to continue."}
        </p>
        <button
          type="button"
          onClick={attemptUnlock}
          disabled={checking}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-600 disabled:opacity-60"
        >
          {checking ? <Loader2 size={16} className="animate-spin" /> : null}
          {checking ? "Verifying..." : "Unlock"}
        </button>
      </div>
    </div>
  )
}
