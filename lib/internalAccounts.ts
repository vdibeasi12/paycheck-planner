// Emails/domains that are Paycheck Planner's own team or personal test
// accounts, never a real customer -- used to keep marketing/traffic
// reporting honest (see app/api/admin/visitors/route.ts and
// app/api/admin/funnels/route.ts). profiles.is_admin already excludes
// security@paycheckplanner.ai (the real admin login) and the
// paycheckplanner.ai domain generally from most of the admin dashboard's
// numbers, but a personal test account used to browse the app as a regular
// non-admin user doesn't carry is_admin and needs to be named here instead.
//
// Investigation, Aug 29 2026: "direct" traffic looked like the one channel
// with a real signup-to-activation path, but most of its volume (21 of 154
// distinct 30-day visitors, and the large majority of raw page views) was
// this handful of accounts testing the app, not prospects. Add to this list
// whenever a new personal/team test account shows up polluting the numbers.
//
// - vincentdibeasi@gmail.com: Vince's own gmail, used to test as a regular
//   user (has real data entered) -- confirmed by Vince, Aug 29 2026.
// - mgsepulveda80@gmail.com: a tester Vince gave full ("connected" tier)
//   access to test features, not an organic signup -- confirmed by Vince,
//   Aug 29 2026. (Full-tier access is via profiles.plan="connected", not
//   is_admin, so she stays out of the admin portal -- but that also means
//   she isn't caught by the is_admin check below and needs listing here.)
const INTERNAL_DOMAINS = ["paycheckplanner.ai"];
const INTERNAL_EMAILS = ["vincentdibeasi@gmail.com", "mgsepulveda80@gmail.com"];

export function isInternalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (INTERNAL_EMAILS.includes(lower)) return true;
  const domain = lower.split("@")[1];
  return !!domain && INTERNAL_DOMAINS.includes(domain);
}
