-- Push notification infrastructure: device tokens, per-trigger preferences,
-- and the small bits of state each trigger needs to fire exactly once per
-- real event instead of spamming on every cron run.

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists idx_push_tokens_user on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- Owner-only access, same posture as every other per-user table in this
-- schema -- the app writes through the authenticated client (registering/
-- removing its own device), crons read through the service role which
-- bypasses RLS entirely.
create policy "push_tokens_select_own" on public.push_tokens
  for select using (auth.uid() = user_id);
create policy "push_tokens_insert_own" on public.push_tokens
  for insert with check (auth.uid() = user_id);
create policy "push_tokens_update_own" on public.push_tokens
  for update using (auth.uid() = user_id);
create policy "push_tokens_delete_own" on public.push_tokens
  for delete using (auth.uid() = user_id);

-- One toggle per trigger, alongside the existing push_bill_reminders.
-- Defaults follow the same opt-out posture as the rest of
-- notification_preferences.
alter table public.notification_preferences
  add column if not exists push_payday_reminder boolean not null default true,
  add column if not exists push_debt_reminder boolean not null default true,
  add column if not exists push_savings_milestone boolean not null default true,
  add column if not exists push_inactivity boolean not null default true;

-- Drives the inactivity trigger (app/api/cron/inactivity-nudge). Updated on
-- each dashboard load (app/dashboard/page.tsx) -- best-effort, not a strict
-- session tracker.
alter table public.profiles
  add column if not exists last_active_at timestamptz;

-- Tracks the highest savings-goal completion percentage already notified,
-- so app/api/cron/savings-milestone fires once per threshold crossed
-- (25/50/75/90/100%) instead of every time the cron runs.
alter table public.financial_goals
  add column if not exists last_milestone_notified_pct integer not null default 0;

comment on table public.push_tokens is 'Capacitor push notification device tokens, one row per (user, device). See lib/push.ts.';
comment on column public.notification_preferences.push_payday_reminder is 'Push before a projected payday. See app/api/cron/payday-reminder.';
comment on column public.notification_preferences.push_debt_reminder is 'Push before a debt payment is due. See app/api/cron/debt-reminder.';
comment on column public.notification_preferences.push_savings_milestone is 'Push when a savings goal crosses 25/50/75/90/100%. See app/api/cron/savings-milestone.';
comment on column public.notification_preferences.push_inactivity is 'Push if the account has been inactive 14 days. See app/api/cron/inactivity-nudge.';
comment on column public.profiles.last_active_at is 'Best-effort last-seen timestamp, updated on dashboard load. Drives the inactivity push trigger.';
comment on column public.financial_goals.last_milestone_notified_pct is 'Highest completion percentage already pushed for this goal, so milestone notifications fire once per threshold.';
