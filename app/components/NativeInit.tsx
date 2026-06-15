"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
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
 * back button, biometric lock — slot into this same effect next.)
 */
export default function NativeInit() {
  const router = useRouter()

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

        try {
          const parsed = new URL(url)
          const code = parsed.searchParams.get("code")
          const errorDescription = parsed.searchParams.get("error_description")

          if (errorDescription) {
            console.error("OAuth callback error:", errorDescription)
          } else if (code) {
            // PKCE: the code verifier is in storage from signInWithOAuth,
            // because this is the same persistent webview context.
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) {
              console.error("exchangeCodeForSession failed:", error.message)
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
          router.push("/dashboard")
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
  }, [router])

  return null
}
