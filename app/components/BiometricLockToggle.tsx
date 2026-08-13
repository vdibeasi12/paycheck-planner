"use client"

import { useEffect, useState } from "react"
import { useIsNativeApp } from "@/lib/platform"
import {
  isBiometricAvailable,
  getBiometricLockEnabled,
  setBiometricLockEnabled,
  verifyBiometric,
} from "@/lib/biometric"
import { Fingerprint, Loader2 } from "lucide-react"

/**
 * Lives in Account & security (app/account/page.tsx). Renders nothing on
 * the web -- there's no separate "web lock screen" to configure, and
 * showing a toggle that does nothing there would just be confusing.
 */
export default function BiometricLockToggle() {
  const native = useIsNativeApp()
  const [available, setAvailable] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (native !== true) return
    ;(async () => {
      const [avail, on] = await Promise.all([
        isBiometricAvailable(),
        getBiometricLockEnabled(),
      ])
      setAvailable(avail)
      setEnabled(on)
      setLoaded(true)
    })()
  }, [native])

  if (native !== true || !loaded) return null

  async function toggle() {
    setError(null)
    setBusy(true)
    try {
      if (!enabled) {
        // Require a successful verification before turning the lock on --
        // otherwise a device with flaky biometrics could strand the user
        // behind a lock screen they can't pass at next launch.
        const ok = await verifyBiometric("Confirm to enable the app lock")
        if (!ok) {
          setError("Verification didn't go through -- the app lock wasn't enabled.")
          return
        }
        await setBiometricLockEnabled(true)
        setEnabled(true)
      } else {
        await setBiometricLockEnabled(false)
        setEnabled(false)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Fingerprint size={20} className="text-emerald-500" />
        <h2 className="text-lg font-semibold text-white">App lock</h2>
      </div>
      <p className="mt-1 text-sm text-gray-400">
        Require Face ID, Touch ID, or your fingerprint to open Paycheck Planner on this
        device. This protects this device, not your account -- it's separate from
        two-factor authentication above.
      </p>

      {!available ? (
        <p className="mt-4 text-sm text-gray-500">
          Set up Face ID, Touch ID, or a fingerprint in your device settings to use this.
        </p>
      ) : (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
            enabled
              ? "border border-gray-700 bg-[#1a233a] text-gray-200 hover:bg-[#242f4a]"
              : "bg-emerald-500 text-black hover:bg-emerald-600"
          }`}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {enabled ? "Turn off app lock" : "Turn on app lock"}
        </button>
      )}
      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
    </div>
  )
}
