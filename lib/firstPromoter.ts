// lib/firstPromoter.ts
//
// The signup half of FirstPromoter tracking.
//
// The three pieces, and where each one lives:
//   1. click      -- the inline fpr("init")/fpr("click") snippet in
//                    app/layout.tsx. Runs on first paint, sets _fprom_tid
//                    when someone lands on a ?fpr=CODE link.
//   2. referral   -- this file. Tells FirstPromoter an account was created.
//   3. conversion -- app/api/stripe/checkout/route.ts, which reads the
//                    _fprom_tid cookie server-side and attaches it to the
//                    Stripe session as metadata.fp_tid.
//
// Sep 12 2026: added after FirstPromoter's "Test Referral Tracking" kept
// failing. Click tracking was live and correct -- verified in the served
// HTML on paycheckplanner.ai -- but step 2 did not exist. Nothing ever told
// FirstPromoter a signup had happened, so a referred visitor stayed an
// anonymous click until (and unless) they paid, and affiliates could not see
// the signups they had actually driven.

type FprFn = (event: string, payload?: Record<string, unknown>) => void

declare global {
  interface Window {
    fpr?: FprFn
  }
}

const FIRED_KEY = "pp_fpr_referral"

// Best-effort dedupe, keyed on the email address rather than the user id so
// that both call sites collapse to one event: the email/password form fires
// at submit time (before an account id exists, and while the _fprom_tid
// cookie is certainly present in that browser), and FirstPromoterReferral
// fires for the OAuth path once the user lands back signed in. FirstPromoter
// upserts leads by email, so a repeat would be harmless anyway.
//
// If storage is unavailable -- private window, blocked site data -- these
// both fail open and the event fires. A duplicate beats a miss.
function alreadyFired(key: string): boolean {
  try {
    return window.localStorage.getItem(FIRED_KEY) === key
  } catch {
    return false
  }
}

function markFired(key: string) {
  try {
    window.localStorage.setItem(FIRED_KEY, key)
  } catch {
    // Dedupe is optional. Tracking is not.
  }
}

// Reports a newly created account to FirstPromoter.
//
// Safe to call unconditionally. fpr() is the queue stub defined inline in the
// document head, so it exists before cdn.firstpromoter.com/fpr.js has
// finished loading and any call made in that window is replayed once it does.
// If the script is blocked outright -- uBlock, Brave shields, a network
// filter -- window.fpr is simply undefined and this no-ops rather than
// throwing inside a signup handler.
//
// The tid is read by FirstPromoter itself from its own _fprom_tid cookie; we
// deliberately do not pass one, so an organic (non-referred) signup is
// reported with no affiliate attached rather than mis-attributed.
export function trackFirstPromoterSignup(email: string, uid?: string) {
  if (typeof window === "undefined") return

  const address = email.trim().toLowerCase()
  if (!address) return
  if (alreadyFired(address)) return

  try {
    if (typeof window.fpr !== "function") return

    const payload: Record<string, unknown> = { email: address }
    if (uid) payload.uid = uid

    window.fpr("referral", payload)
    markFired(address)
  } catch {
    // Never let affiliate tracking break a signup.
  }
}
