// lib/protectedRoutes.ts
//
// The one list of routes that require a signed-in user. Extracted from
// middleware.ts on Sep 12 2026 because app/layout.tsx now needs the same
// answer, and two copies of a security-relevant list is how a route quietly
// stops being protected in one of them.

export const PROTECTED_ROUTES = [
  "/dashboard",
  "/admin",
  "/debts",
  "/bills",
  "/income",
  "/analytics",
  "/ai-chat",
  "/ai-advisor",
  "/ai-recommendations",
  "/report",
  "/debt-payoff-calculator",
  "/documents",
  "/goals",
  "/survival-mode",
  "/safe-to-spend",
  "/paycheck-shield",
  "/paycheck-autopilot",
  "/plan-drift",
  "/achievements",
  "/account",
  "/insights",
  "/mfa",
] as const

// Exact paths that sit UNDER a protected prefix but must stay public.
//
// /account/delete-info is the "Delete My Data" page linked from the footer and
// from DeleteAccount.tsx. It is static instructions only (no user data), and
// it has to be readable by someone who is signed out -- the
// whole point is telling a person how to delete an account they may no longer
// be able to log in to. Until Oct 7 2026 the "/account" prefix swept it up and
// every signed-out visitor was bounced to /login.
//
// Keep this list to exact matches of content-only pages. Never add a prefix
// here: that would silently unprotect everything below it.
export const PUBLIC_EXCEPTIONS = ["/account/delete-info"] as const

export function isProtectedPath(path: string): boolean {
  if ((PUBLIC_EXCEPTIONS as readonly string[]).includes(path)) return false
  return PROTECTED_ROUTES.some((p) => path === p || path.startsWith(p + "/"))
}
