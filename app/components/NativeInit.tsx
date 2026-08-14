"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { isNativeApp } from "@/lib/platform"

/**
 * Mounted once at the app root (see app/layout.tsx). Runs ONLY inside the
 * Capacitor native shell — on the web every effect below is a no-op.
 *
 * Responsibilities:
 *  1. Catch the Google-OAuth deep-link callback that the system browser
 *     hands back to the app, exchange the code for a Supabase session,
 *     close the in-app browser, and route to the dashboard.
 *
 * Capacitor plugins are loaded with dynamic import() so they never enter the
 * web bundle or run during SSR. The native runtime injects window.Capacitor,
 * so these imports only actually execute on device.
 *
 * NOTE (Guideline 4.2 native touches — status bar, splash screen, Android
 * back button — slot into this same effect next. Biometric app lock lives
 * separately in BiometricLock.tsx / lib/biometric.ts, since it only applies
 * to logged-in users and needs its own lifecycle.)
 */
export default function NativeInit() {
  useEffect(() => {
    if (!isNativeApp()) return

    let removeListener: (() => void) | undefined
    let cancelled = false

    ;(async () => {
      const { App } = await import("@capacitor/app")
      const { Browser } = await import("@capacitor/browser")

      const handle = await App.addListener("appUrlOpen", async ({ url }) => {
        // Expect: com.dibeasi.paycheckplanner://auth-callback?code=XXXX
        if (!url || !url.includes("auth-callback")) return

        // Where we land once the callback is handled. Defaults to bouncing
        // back to login -- only a genuinely successful token exchange below
        // sends the user into the app. Previously this always went to
        // /dashboard even when the exchange failed or Google reported an
        // error, silently swallowing the failure instead of showing it.
        let destination = "/login"

        try {
          const parsed = new URL(url)
          const code = parsed.searchParams.get("code")
          const errorDescription = parsed.searchParams.get("error_description")

          if (errorDescription) {
            console.error("OAuth callback error:", errorDescription)
            destination = `/login?message=${encodeURIComponent(errorDescription)}`
          } else if (code) {
            // PKCE: the code verifier is in storage from signInWithOAuth,
            // because this is the same persistent webview context.
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) {
              console.error("exchangeCodeForSession failed:", error.message)
              destination = `/login?message=${encodeURIComponent(error.message)}`
            } else {
              destination = "/dashboard"
            }
          }
        } catch (e) {
          console.error("Failed to handle auth deep link:", e)
        } finally {
          // Close the system browser tab and continue into the app.
          try {
            await Browser.close()
          } catch {
            /* browser may already be closed */
          }
          // Hard navigation, NOT router.push(). exchangeCodeForSession above
          // just set the session cookie, but the app's root layout (Sidebar,
          // BiometricLock, the logged-out marketing header) was server-
          // rendered back when /login first loaded, before that cookie
          // existed. router.push() reuses that already-mounted layout
          // instead of re-running it against the now-current cookies, so a
          // successful Google sign-in looked stuck loading / never actually
          // let the user into the app. A full navigation forces the whole
          // server component tree to re-run, the same way the email/password
          // and MFA-verify flows already do (see login/page.tsx, which uses
          // window.location.href for exactly this reason).
          window.location.href = destination
        }
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
  }, [])

  return null
}
