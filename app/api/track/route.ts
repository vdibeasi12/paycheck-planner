import { NextResponse } from "next/server"
import { checkAnonRateLimit, getClientIp } from "@/lib/anonRateLimit"
import { track } from "@/lib/track"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Admin Phase 3: the one public, client-callable tracking endpoint. Every
// other track() call site is a trusted server route (see lib/track.ts) --
// this is deliberately the single exception, so it gets its own posture:
//
//   - eventName is allowlisted to exactly the two event types below. This is
//     NOT a generic "insert anything into public.events" endpoint -- letting
//     an anonymous caller pick an arbitrary event_name would poison the
//     admin dashboard's counts for signup_completed, subscription_started,
//     etc.
//   - every field is length-capped and type-checked before it touches
//     metadata; nothing from the request body is trusted as-is.
//   - rate-limited per IP via the same anon_rate_limits mechanism as the
//     public subscribe forms, but with a much higher/shorter-window budget
//     (page views are frequent and legitimate; email-bombing a form is not).
//   - never blocks or throws on the caller: any failure returns 204 so a
//     tracking hiccup can't show up as a console error on a real visitor's
//     browser.
const ALLOWED_EVENTS = new Set(["page_view", "cta_clicked", "referral_click"])

function cap(s: unknown, max: number): string | null {
  if (typeof s !== "string") return null
  const trimmed = s.trim().slice(0, max)
  return trimmed || null
}

async function resolveUserId(): Promise<string | null> {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    return data?.user?.id ?? null
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return new NextResponse(null, { status: 204 })
    }

    const eventName = typeof body.eventName === "string" ? body.eventName : ""
    if (!ALLOWED_EVENTS.has(eventName)) {
      return new NextResponse(null, { status: 204 })
    }

    const ip = getClientIp(req)
    // Separate budget per event type: page_view fires once per navigation
    // and can legitimately happen dozens of times in a session; cta_clicked
    // is rare by nature. 300 page_views / 5 min / IP comfortably covers a
    // real visitor including the Capacitor-wrapped app; a script hammering
    // this endpoint still gets capped.
    const underLimit = await checkAnonRateLimit(`track:${eventName}`, ip, {
      limit: eventName === "page_view" ? 300 : 60,
      window: 300,
    })
    if (!underLimit) {
      return new NextResponse(null, { status: 204 })
    }

    const userId = await resolveUserId()

    const metadata: Record<string, unknown> = {
      path: cap(body.path, 300),
      visitorId: cap(body.visitorId, 100),
      loggedIn: !!userId,
    }
    if (eventName === "page_view") {
      metadata.source = cap(body.source, 100)
      metadata.medium = cap(body.medium, 100)
      metadata.campaign = cap(body.campaign, 100)
    } else if (eventName === "referral_click") {
      metadata.ref = cap(body.ref, 100)
    } else {
      metadata.cta = cap(body.cta, 100)
    }

    await track(eventName, { userId, metadata })

    return new NextResponse(null, { status: 204 })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
