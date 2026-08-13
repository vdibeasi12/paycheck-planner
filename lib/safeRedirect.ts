// Only allow same-origin relative redirects (prevents open-redirect abuse).
// Was previously duplicated in app/mfa/page.tsx and app/mfa/setup/page.tsx;
// app/auth/callback/route.ts used the raw `next` param unvalidated -- same
// bug class, just not yet exploitable there. One shared implementation now.
export function safeRedirect(raw: string | null, fallback = "/dashboard"): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw
  }
  return fallback
}
