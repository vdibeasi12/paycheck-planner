"use client"

import { isNativeApp } from "@/lib/platform"

// Device-local preference key (Capacitor Preferences -- SharedPreferences on
// Android, UserDefaults on iOS). Deliberately NOT stored in the profiles
// table: this is a per-device setting (a new phone shouldn't inherit the
// lock state of an old one), not an account setting.
const LOCK_PREF_KEY = "pp_biometric_lock_enabled"

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
