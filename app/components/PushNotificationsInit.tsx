"use client"

import { useEffect } from "react"
import { isNativeApp } from "@/lib/platform"
import { supabase } from "@/lib/supabase/client"

/**
 * Mounted once at the app root for logged-in users (see app/layout.tsx),
 * right alongside BiometricLock -- same "native-only, logged-in-only"
 * posture. A no-op on the web.
 *
 * Requests push permission, registers the device with the platform push
 * service (APNs on iOS, FCM on Android via Capacitor's plugin), and sends
 * the resulting token to app/api/push/register so the server-side triggers
 * (payday, bill, debt, savings milestone, inactivity -- see
 * app/api/cron/*) can actually deliver to this device. Registration is
 * silently skipped if the user has never granted permission; this never
 * blocks or interrupts the rest of the app either way.
 */
export default function PushNotificationsInit() {
  useEffect(() => {
    if (!isNativeApp()) return

    let removeListeners: (() => void) | undefined
    let cancelled = false

    ;(async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications")
        const { Capacitor } = await import("@capacitor/core")

        let permStatus = await PushNotifications.checkPermissions()
        if (permStatus.receive === "prompt" || permStatus.receive === "prompt-with-rationale") {
          permStatus = await PushNotifications.requestPermissions()
        }
        if (permStatus.receive !== "granted") return
        if (cancelled) return

        const registrationHandle = await PushNotifications.addListener(
          "registration",
          async (token) => {
            try {
              const { data: sessionData } = await supabase.auth.getSession()
              const accessToken = sessionData?.session?.access_token
              if (!accessToken) return
              await fetch("/api/push/register", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: "Bearer " + accessToken,
                },
                body: JSON.stringify({
                  token: token.value,
                  platform: Capacitor.getPlatform(),
                }),
              })
            } catch {
              // Registration is a nice-to-have on any single launch -- the
              // next app open tries again, no need to surface this.
            }
          }
        )

        const errorHandle = await PushNotifications.addListener("registrationError", (err) => {
          console.warn("Push registration failed:", err)
        })

        if (cancelled) {
          registrationHandle.remove()
          errorHandle.remove()
        } else {
          removeListeners = () => {
            registrationHandle.remove()
            errorHandle.remove()
          }
        }

        await PushNotifications.register()
      } catch {
        // Plugin unavailable (e.g. running in a browser tab that thinks
        // it's native during dev) -- push is a progressive enhancement,
        // never block app startup over it.
      }
    })()

    return () => {
      cancelled = true
      removeListeners?.()
    }
  }, [])

  return null
}
