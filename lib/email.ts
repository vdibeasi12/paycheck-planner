// lib/email.ts
// Lazy, fail-safe Resend client for product emails (trial + upsell).
// Auth emails are handled by Supabase. The Resend SDK throws if constructed
// without a key, so we defer creation and no-op gracefully when unconfigured.

import { Resend } from "resend"

let client: Resend | null = null

function getClient(): Resend | null {
  if (client) return client
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  client = new Resend(key)
  return client
}

export const resend = {
  emails: {
    async send(payload: Parameters<Resend["emails"]["send"]>[0]) {
      const c = getClient()
      if (!c) {
        console.warn("RESEND_API_KEY not set — skipping email send")
        return { data: null, error: { message: "Email not configured" } }
      }
      return c.emails.send(payload)
    },
  },
}

export default resend
