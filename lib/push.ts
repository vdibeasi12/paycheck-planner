// lib/push.ts
// Lazy, fail-safe Firebase Cloud Messaging sender for push notifications.
// Same posture as lib/email.ts: never throws if unconfigured, just skips.
//
// Requires FIREBASE_SERVICE_ACCOUNT_JSON -- the full JSON key for a Firebase
// service account with Cloud Messaging permission, as a single-line env var.
// Get it from the Firebase console (Project settings -> Service accounts ->
// Generate new private key) once a Firebase project exists. Until that's
// set, every send() call below is a no-op -- the app and its crons keep
// working exactly as they do today, just without push delivery.

import type { App } from "firebase-admin/app"
import { createClient } from "@supabase/supabase-js"

let app: App | null = null
let initTried = false

function getApp(): App | null {
  if (app) return app
  if (initTried) return null
  initTried = true

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) return null

  try {
    // Dynamic require so firebase-admin (and its dependency tree) is only
    // pulled in when actually configured -- keeps it out of routes/builds
    // that never touch push.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initializeApp, cert, getApps } = require("firebase-admin/app")
    const serviceAccount = JSON.parse(raw)
    const existing = getApps()
    app = existing.length > 0 ? existing[0] : initializeApp({ credential: cert(serviceAccount) })
    return app
  } catch (e) {
    console.error("Firebase Admin init failed -- push notifications disabled:", e)
    return null
  }
}

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } }
  )
}

export type PushResult = { sent: number; failed: number }

// Sends the same notification to every registered device for a user, and
// prunes tokens FCM reports as no-longer-valid (uninstalled app, expired
// registration) so push_tokens doesn't accumulate dead rows forever.
export async function sendPushToUser(
  userId: string,
  notification: { title: string; body: string },
  data?: Record<string, string>
): Promise<PushResult> {
  const firebaseApp = getApp()
  if (!firebaseApp) return { sent: 0, failed: 0 }

  const db = adminDb()
  const { data: tokens } = await db.from("push_tokens").select("id, token").eq("user_id", userId)
  if (!tokens || tokens.length === 0) return { sent: 0, failed: 0 }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { getMessaging } = require("firebase-admin/messaging")
  const messaging = getMessaging(firebaseApp)

  let sent = 0
  let failed = 0
  const deadTokenIds: string[] = []

  for (const t of tokens) {
    try {
      await messaging.send({
        token: t.token,
        notification,
        data,
      })
      sent++
    } catch (e: any) {
      failed++
      const code = e?.errorInfo?.code || e?.code || ""
      if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) {
        deadTokenIds.push(t.id)
      }
    }
  }

  if (deadTokenIds.length > 0) {
    await db.from("push_tokens").delete().in("id", deadTokenIds)
  }

  return { sent, failed }
}
