"use client"

import { useEffect } from "react"

const COOKIE_NAME = "pp_attr"
const COOKIE_DAYS = 30

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
  return match ? decodeURIComponent(match[2]) : null
}

// Friendly-name known referrer hostnames so "how they found the app" is
// still useful even when a link isn't UTM-tagged (e.g. an organic Google
// result, or someone pasting a YouTube video link with no tracking params).
function classifyReferrer(hostname: string): string {
  const host = hostname.toLowerCase()
  if (host.includes("google")) return "google"
  if (host.includes("youtube") || host.includes("youtu.be")) return "youtube"
  if (host.includes("facebook") || host.includes("fb.com") || host.includes("fb.me")) return "facebook"
  if (host.includes("instagram")) return "instagram"
  if (host.includes("tiktok")) return "tiktok"
  if (host.includes("twitter") || host.includes("x.com") || host.includes("t.co")) return "twitter"
  if (host.includes("reddit")) return "reddit"
  if (host.includes("linkedin")) return "linkedin"
  if (host.includes("bing")) return "bing"
  if (host.includes("duckduckgo")) return "duckduckgo"
  if (host.includes("pinterest")) return "pinterest"
  return host
}

// Captures where a visitor first arrived from -- UTM params if present,
// otherwise a classified referrer, otherwise "direct" -- into a first-party
// cookie. Read later at signup time (app/auth/callback/route.ts) to attach
// real marketing attribution to new accounts. Fires once per device: the
// first visit wins and is never overwritten by later visits.
export default function AttributionCapture() {
  useEffect(() => {
    if (getCookie(COOKIE_NAME)) return

    try {
      const params = new URLSearchParams(window.location.search)
      const utmSource = params.get("utm_source")
      const utmMedium = params.get("utm_medium")
      const utmCampaign = params.get("utm_campaign")

      let source = utmSource
      if (!source && document.referrer) {
        try {
          const refHost = new URL(document.referrer).hostname
          if (refHost && refHost !== window.location.hostname) {
            source = classifyReferrer(refHost)
          }
        } catch {
          // malformed referrer URL -- ignore, falls through to "direct"
        }
      }
      if (!source) source = "direct"

      const medium = utmMedium || (utmSource ? "unknown" : document.referrer ? "referral" : "none")

      const attribution = {
        source,
        medium,
        campaign: utmCampaign || null,
        referrer: document.referrer || null,
      }

      setCookie(COOKIE_NAME, JSON.stringify(attribution), COOKIE_DAYS)
    } catch {
      // Attribution is a nice-to-have -- never let it throw in the app shell.
    }
  }, [])

  return null
}
