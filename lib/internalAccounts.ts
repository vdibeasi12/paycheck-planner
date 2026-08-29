// Emails/domains that are Paycheck Planner's own team or personal test
// accounts, never a real customer -- used to keep marketing/traffic
// reporting honest (see app/api/admin/visitors/route.ts). profiles.is_admin
// already excludes the real admin login from most of the admin dashboard's
// revenue numbers (MRR, paid users, conversion), but a personal test
// account used to browse the app as a regular non-admin user -- Vince's own
// gmail, for example -- doesn't carry is_admin and needs to be named here
// instead.
//
// Investigation, Aug 29 2026: "direct" traffic looked like the one channel
// with a real signup-to-activation path, but most of its volume (21 of 154
// distinct 30-day visitors, and the large majority of raw page views) was
// this handful of accounts testing the app, not prospects. Add to this list
// whenever a new personal/team test account shows up polluting the numbers.
const INTERNAL_DOMAINS = ["paycheckplanner.ai"];
const INTERNAL_EMAILS = ["vincentdibeasi@gmail.com"];

export function isInternalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (INTERNAL_EMAILS.includes(lower)) return true;
  const domain = lower.split("@")[1];
  return !!domain && INTERNAL_DOMAINS.includes(domain);
}
