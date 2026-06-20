// Canonical site origin for building auth redirect URLs (password recovery,
// OAuth callback). Pin it with NEXT_PUBLIC_SITE_URL so links always resolve to
// the production domain even when the user happens to start the flow on a stale
// Vercel preview/permalink. Falls back to the live browser origin when the env
// var is unset, and to an empty string on the server (these helpers are only
// ever called from client components).
export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}