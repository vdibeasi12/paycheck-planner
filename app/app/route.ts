import { NextResponse, after } from "next/server"
import { track } from "@/lib/track"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /app -- the single destination every "get the mobile app" QR code and
// short link points at.
//
// The QR could have encoded the Play Store URL directly, and used to. Two
// reasons it goes through here instead:
//
//   1. A QR code is permanent in a way a link is not. It ends up in a
//      screenshot, a slide, a flyer, someone's camera roll. Encoding the Play
//      Store URL means the day the App Store build ships, every code already
//      out there still sends iPhone users to a page they cannot use. Pointing
//      at a URL we control means the destination is a one-line change here.
//
//   2. Shorter data makes a materially better code. "/app" fits in a version-3
//      symbol (29 modules) where the full Play Store URL needs version 5 (37).
//      At the same on-screen size that is ~25% more pixels per module, which
//      is the difference between a code that scans from across a desk and one
//      that does not. See app/components/AppQrCode.tsx.
const PLAY_URL = "https://play.google.com/store/apps/details?id=com.dibeasi.paycheckplanner"

// TO SHIP iOS: put the App Store listing URL here. That is the whole change --
// every QR code and link already in the wild starts working for iPhone users
// the moment it deploys. Empty string means "not live yet."
const APP_STORE_URL = ""

// Where an iPhone goes while the App Store build is not out. Sending them to
// the Play Store would be actively useless, so they get the site, which runs
// fine in mobile Safari and is the honest answer to "can I use this on my
// phone today." Logged-in users get moved on to the dashboard by middleware.
const IOS_FALLBACK = "/"

function isIOS(ua: string): boolean {
  // iPadOS 13+ reports a desktop Macintosh UA, so the touch-capable Mac case
  // is included -- a Mac cannot install either app anyway, and the site is
  // the right destination for both.
  return /iphone|ipad|ipod/.test(ua) || /macintosh/.test(ua)
}

export async function GET(req: Request) {
  const ua = (req.headers.get("user-agent") || "").toLowerCase()
  const url = new URL(req.url)

  let target: string
  let platform: string

  if (isIOS(ua)) {
    platform = "ios"
    target = APP_STORE_URL || new URL(IOS_FALLBACK, url.origin).toString()
  } else {
    platform = /android/.test(ua) ? "android" : "other"
    target = PLAY_URL
  }

  // after() rather than await: this is the one place a QR scan is observable,
  // so it is worth recording -- but a person is standing there holding a phone
  // waiting for it, and a Supabase insert has no business sitting between the
  // scan and the store page. after() runs it once the redirect has already
  // gone out, and keeps the serverless function alive to finish it instead of
  // it being killed mid-write the way a bare un-awaited promise would be.
  // track() swallows its own failures (see lib/track.ts) either way.
  const source = url.searchParams.get("s") || "unknown"
  after(async () => {
    // Lets a specific code be attributed later without minting new URLs:
    // /app?s=footer, /app?s=homepage, /app?s=flyer.
    await track("app_link_opened", { metadata: { platform, source } })
  })

  // 307, not 308: the destination is decided per request from the User-Agent,
  // so it must never be cached by a browser or a CDN as permanent.
  return NextResponse.redirect(target, 307)
}
