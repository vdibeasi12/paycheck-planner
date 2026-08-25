-- Adds a per-user unsubscribe token to notification_preferences so
-- account-tied reminder emails (bill/payday reminders) can carry a real
-- one-click unsubscribe link, matching the existing pattern already used by
-- blog_subscribers / challenge_subscribers / lead_magnet_subscribers /
-- abandoned_signups / profiles.onboarding_unsub_token. Handled by
-- app/api/notifications/unsubscribe/route.ts.
alter table public.notification_preferences
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists notification_preferences_unsubscribe_token_key
  on public.notification_preferences (unsubscribe_token);
