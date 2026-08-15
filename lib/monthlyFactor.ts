// lib/monthlyFactor.ts
// Canonical monthly-equivalent multiplier for a recurring amount, given its
// billing/pay frequency. This used to be hand-copied in app/dashboard/page.tsx,
// app/income/page.tsx, and app/bills/page.tsx -- the copies had already
// drifted (the income page's version had no "one-time" case and silently
// treated a one-time payment as if it recurred every month, since it fell
// through to `default: return 1`). Import this everywhere a monthly-
// equivalent amount is needed instead of re-copying it, so the numbers can
// never diverge again (QA fix, Aug 15 2026 -- see /root/.claude/plans
// history for the audit that found the drift).
export function monthlyFactor(freq?: string | null): number {
  switch ((freq || 'monthly').toLowerCase()) {
    case 'weekly':
      return 52 / 12
    case 'biweekly':
    case 'bi-weekly':
    case 'every two weeks':
      return 26 / 12
    case 'semimonthly':
    case 'semi-monthly':
    case 'twice a month':
      return 2
    case 'quarterly':
      return 1 / 3
    case 'annual':
    case 'annually':
    case 'yearly':
      return 1 / 12
    case 'one-time':
    case 'one time':
    case 'once':
      return 0
    default:
      return 1
  }
}
