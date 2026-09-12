"use client"

import { useEffect } from "react"
import { trackFirstPromoterSignup } from "@/lib/firstPromoter"

// Same window app/auth/callback/route.ts uses to decide whether a session
// belongs to a brand-new account. Kept identical on purpose: two different
// definitions of "just signed up" in one codebase is how attribution starts
// disagreeing with itself.
const FRESH_SIGNUP_WINDOW_MS = 10 * 60 * 1000

type Props = {
  uid: string
  email: string
  createdAt: string | undefined
}

// Covers the signup paths that never come back to the signup form: Google
// OAuth (web and native, both of which leave the page and return through
// /auth/callback) and an email confirmation link opened in this browser.
//
// The email/password form reports itself at submit time instead, because
// that is the one moment we know the _fprom_tid cookie is in the browser
// doing the signing up -- a confirmation link opened later on a different
// device would not carry it.
//
// Takes the user from the server layout, which has already resolved it, so
// this adds no Supabase round-trip to any page load. It only calls through
// inside the fresh-signup window, and trackFirstPromoterSignup dedupes by
// email, so mounting this in the app shell still fires at most one event per
// account.
export default function FirstPromoterReferral({ uid, email, createdAt }: Props) {
  useEffect(() => {
    if (!email || !createdAt) return

    const created = new Date(createdAt).getTime()
    if (!Number.isFinite(created)) return

    const age = Date.now() - created
    if (age < 0 || age > FRESH_SIGNUP_WINDOW_MS) return

    trackFirstPromoterSignup(email, uid)
  }, [uid, email, createdAt])

  return null
}
