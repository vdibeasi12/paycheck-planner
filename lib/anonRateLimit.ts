// lib/anonRateLimit.ts
// Rate limiting for anonymous public endpoints (email-capture forms, and now
// the page_view/cta_clicked tracking endpoint). See
// supabase/migrations/20260813070000_anon_rate_limits.sql (original table +
// function) and supabase/migrations/20260813090000_track_rate_limit_params.sql
// (added optional per-call limit/window -- the 5/hour default is right for
// email forms but far too strict for page-view tracking) for why this is
// separate from check_and_increment_rate_limit (that one requires auth.uid()
// and always rejects logged-out callers).

import { createClient } from "@supabase/supabase-js"

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } }
  )
}

// Best-effort client IP extraction behind Vercel's proxy.
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip") || "unknown"
}

// Fails OPEN on any error (missing env, DB hiccup, etc) -- a rate-limit
// outage should never block a legitimate signup or page view. It only
// exists to stop a single IP from hammering the same bucket (e.g.
// email-bombing someone else's inbox via a public subscribe form, or
// flooding the events table via the tracking endpoint).
//
// opts.limit/opts.window let a caller loosen the default 5-requests/hour
// posture (e.g. the tracking endpoint passes a much higher, shorter-window
// limit suited to normal page-view volume) without changing behavior for
// existing 2-arg callers, which keep the original 5/3600 default.
export async function checkAnonRateLimit(
  bucket: string,
  ip: string,
  opts?: { limit?: number; window?: number }
): Promise<boolean> {
  try {
    const sb = serviceClient()
    const { data, error } = await sb.rpc("check_and_increment_anon_rate_limit", {
      p_bucket: bucket,
      p_ip: ip,
      ...(opts?.limit !== undefined ? { p_limit: opts.limit } : {}),
      ...(opts?.window !== undefined ? { p_window: opts.window } : {}),
    })
    if (error) return true
    return data !== false
  } catch {
    return true
  }
}
