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

export function isProtectedPath(path: string): boolean {
  return PROTECTED_ROUTES.some((p) => path === p || path.startsWith(p + "/"))
}
