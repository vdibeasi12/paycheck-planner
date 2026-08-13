"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { trackPageView } from "@/lib/trackClient"

const ATTR_COOKIE = "pp_attr"

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
  return match ? decodeURIComponent(match[2]) : null
}

// Fires a page_view on first mount and on every client-side route change.
// Reads first-touch attribution (source/medium/campaign) from the pp_attr
// cookie that AttributionCapture sets -- this component must be rendered
// AFTER <AttributionCapture /> in app/layout.tsx so that cookie already
// exists by the time this effect runs on the very first page.
//
// Deliberately doesn't use next/navigation's useSearchParams (that hook
// forces a Suspense boundary / opts the whole tree out of static rendering
// -- see AttributionCapture's own comment-free avoidance of it). Query
// params still reach the events table via the pp_attr cookie's one-time
// capture, same as AttributionCapture; a query-only navigation that
// doesn't change the pathname isn't counted as a second page view, which
// matches "contained, no new infra" scope.
//
// Skips /admin: those are the admin's own dashboard visits, not marketing
// traffic, and would otherwise inflate the visitor numbers the dashboard
// itself is trying to report.
export default function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return

    let source: string | null = null
    let medium: string | null = null
    let campaign: string | null = null
    try {
      const raw = getCookie(ATTR_COOKIE)
      if (raw) {
        const attr = JSON.parse(raw)
        source = attr?.source ?? null
        medium = attr?.medium ?? null
        campaign = attr?.campaign ?? null
      }
    } catch {
      /* malformed cookie -- track the view anyway, just without attribution */
    }

    trackPageView({ path: pathname, source, medium, campaign })
  }, [pathname])

  return null
}
