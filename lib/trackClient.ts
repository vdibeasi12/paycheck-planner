// lib/trackClient.ts
// Client-side counterpart to lib/track.ts, for the two event types the
// public app/api/track route accepts (see that file's comment for why the
// allowlist exists). Never throws, never awaited by callers -- fire and
// forget, same "must not break the UI it's attached to" posture as the
// server-side track() helper.

const COOKIE_NAME = "pp_vid"
const COOKIE_DAYS = 365

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
  return match ? decodeURIComponent(match[2]) : null
}

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

// Anonymous, device-scoped visitor id -- separate from the pp_attr
// (attribution) cookie and much longer-lived, since its only job is letting
// the admin dashboard count unique visitors, not attribute a conversion.
// Not tied to an account: a logged-in user still carries whatever
// visitor id their browser had before they signed up.
export function getVisitorId(): string {
  try {
    const existing = getCookie(COOKIE_NAME)
    if (existing) return existing
    const id = randomId()
    setCookie(COOKIE_NAME, id, COOKIE_DAYS)
    return id
  } catch {
    return "unknown"
  }
}

function send(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload)
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" })
      const ok = navigator.sendBeacon("/api/track", blob)
      if (ok) return
    }
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* tracking must never throw into the calling component */
  }
}

export function trackPageView(opts: {
  path: string
  source?: string | null
  medium?: string | null
  campaign?: string | null
}) {
  send({
    eventName: "page_view",
    visitorId: getVisitorId(),
    path: opts.path,
    source: opts.source ?? undefined,
    medium: opts.medium ?? undefined,
    campaign: opts.campaign ?? undefined,
  })
}

// Fire-and-forget CTA click tracking. Call this directly in an onClick
// handler -- it does not delay or block navigation.
export function trackCta(cta: string, path?: string) {
  send({
    eventName: "cta_clicked",
    visitorId: getVisitorId(),
    cta,
    path: path ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
  })
}

// A visit carrying ?ref=<code> -- counted once per new/changed ref (see
// AttributionCapture.tsx, which already dedupes first-touch vs a changed
// referral code the same way). This is the top of the referral funnel:
// click -> signup (app/auth/callback/route.ts's creditReferralIfPresent) ->
// activated -> paid, same shape as the source/campaign funnels.
export function trackReferralClick(ref: string) {
  send({
    eventName: "referral_click",
    visitorId: getVisitorId(),
    ref,
  })
}
