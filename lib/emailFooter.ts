// lib/emailFooter.ts
// Shared CAN-SPAM footer pieces for outbound emails.
//
// addressLine() -- the required physical postal address, appended to every
// commercial email template (one-time sends and recurring sequences alike).
//
// reminderUnsubLinks() -- for the two account-tied reminder emails
// (bill/payday) that previously had no footer at all. Gives a one-click
// "unsubscribe from just this reminder" link (same per-list-token pattern
// already used by the onboarding/blog/challenge/lead-magnet/abandoned-signup
// sequences, just scoped to a single notification_preferences column) plus
// an "unsubscribe from everything" link and a link to the full preferences
// page for granular control. See app/api/notifications/unsubscribe/route.ts
// for the handler and lib/../notification_preferences.unsubscribe_token for
// the token column (added in the notification_preferences_unsubscribe_token
// migration).

export function addressLine(): string {
  return (
    '<p style="margin:8px 0 0;font-size:11px;color:#6b7280;">' +
    "Paycheck Planner, 360 W Schick Rd Ste 23 #2076, Bloomingdale, IL 60108" +
    "</p>"
  )
}

export function reminderUnsubLinks(unsubUrl: string, allUrl: string): string {
  return (
    '<p style="margin-top:20px;font-size:12px;color:#6b7280;border-top:1px solid #1f2937;padding-top:16px;">' +
    "You're getting this because you turned on this reminder in your Paycheck Planner account. " +
    '<a style="color:#6b7280;" href="' +
    unsubUrl +
    '">Unsubscribe from this reminder</a>' +
    " &middot; " +
    '<a style="color:#6b7280;" href="' +
    allUrl +
    '">Unsubscribe from all emails</a>' +
    " &middot; " +
    '<a style="color:#6b7280;" href="https://paycheckplanner.ai/account">Manage preferences</a>' +
    "</p>" +
    addressLine()
  )
}
