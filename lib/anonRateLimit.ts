// lib/anonRateLimit.ts
// Rate limiting for anonymous public endpoints (email-capture forms). See
// supabase/migrations/20260813070000_anon_rate_limits.sql for why this is
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
// outage should never block a legitimate signup. It only exists to stop a
// single IP from hammering the same bucket (e.g. email-bombing someone
// else's inbox via a public subscribe form).
export async function checkAnonRateLimit(bucket: string, ip: string): Promise<boolean> {
  try {
    const sb = serviceClient()
    const { data, error } = await sb.rpc("check_and_increment_anon_rate_limit", {
      p_bucket: bucket,
      p_ip: ip,
    })
    if (error) return true
    return data !== false
  } catch {
    return true
  }
}
