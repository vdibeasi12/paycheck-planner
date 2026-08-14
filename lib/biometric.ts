"use client"

import { isNativeApp } from "@/lib/platform"

// Device-local preference key (Capacitor Preferences -- SharedPreferences on
// Android, UserDefaults on iOS). Deliberately NOT stored in the profiles
// table: this is a per-device setting (a new phone shouldn't inherit the
// lock state of an old one), not an account setting.
const LOCK_PREF_KEY = "pp_biometric_lock_enabled"

// How long the app can sit in the background before the next return to the
// foreground requires biometrics again -- a second, independent per-device
// preference from LOCK_PREF_KEY above (whether the lock is on at all).
// 0 = "Immediately" (re-lock on every single return from background, the
// recommended default for a finance app), 60000/300000/900000 = the matching
// minute grace period, "never" = don't re-lock just for backgrounding --
// only a genuine cold start (the app process wasn't already running) locks.
// That last case still can't be fully bypassed: once the OS actually kills a
// backgrounded WebView (which happens on its own under memory pressure, not
// just from an explicit swipe-away), the next open is a cold start and locks
// regardless of this setting -- "never" only skips the timer-based re-lock
// for quick app-switches where the process stayed alive.
const LOCK_TIMING_KEY = "pp_biometric_lock_timing_ms"

export type LockTiming = 0 | 60000 | 300000 | 900000 | "never"

// All Capacitor plugin imports below are dynamic so they never enter the web
// bundle and never run during SSR -- same pattern as NativeInit.tsx. Both
// packages ship a web stub, so this would technically work statically too,
// but dynamic keeps native-only code paths out of the browser bundle.

export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNativeApp()) return false
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth")
    const result = await BiometricAuth.checkBiometry()
    return result.isAvailable
  } catch {
    return false
  }
}

export async function getBiometricLockEnabled(): Promise<boolean> {
  if (!isNativeApp()) return false
  try {
    const { Preferences } = await import("@capacitor/preferences")
    const { value } = await Preferences.get({ key: LOCK_PREF_KEY })
    return value === "true"
  } catch {
    return false
  }
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  if (!isNativeApp()) return
  const { Preferences } = await import("@capacitor/preferences")
  await Preferences.set({ key: LOCK_PREF_KEY, value: enabled ? "true" : "false" })
}

export async function getLockTiming(): Promise<LockTiming> {
  if (!isNativeApp()) return 0
  try {
    const { Preferences } = await import("@capacitor/preferences")
    const { value } = await Preferences.get({ key: LOCK_TIMING_KEY })
    if (value === "never") return "never"
    const n = Number(value)
    if (n === 60000 || n === 300000 || n === 900000) return n
    return 0
  } catch {
    return 0
  }
}

export async function setLockTiming(timing: LockTiming): Promise<void> {
  if (!isNativeApp()) return
  const { Preferences } = await import("@capacitor/preferences")
  await Preferences.set({ key: LOCK_TIMING_KEY, value: String(timing) })
}

// Prompts Face ID / Touch ID / Android fingerprint, falling back to the
// device PIN/passcode if biometrics aren't enrolled or fail mid-attempt.
// Never throws -- resolves false on any cancellation or failure so callers
// can just branch on the boolean.
export async function verifyBiometric(reason: string): Promise<boolean> {
  if (!isNativeApp()) return true
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth")
    await BiometricAuth.authenticate({
      reason,
      allowDeviceCredential: true,
      androidTitle: "Unlock Paycheck Planner",
      androidSubtitle: reason,
      cancelTitle: "Cancel",
    })
    return true
  } catch {
    return false
  }
}
