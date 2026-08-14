-- Abandoned signup recovery (Task #22): captures the email a visitor types
-- into the signup form before they complete supabase.auth.signUp(), so we
-- can nudge them back if they never finish. Mirrors the
-- lead_magnet_subscribers / challenge_subscribers pattern -- one row per
-- email, service-role only, no client-facing RLS policies.
--
-- "Actually signed up" is detected by an email match against
-- public.profiles rather than a flag set from the client: profiles rows
-- are created immediately at signUp() time by the on_auth_user_created
-- trigger (handle_new_user), before email confirmation -- so this is a
-- reliable signal that doesn't depend on a fire-and-forget client call
-- succeeding. See app/api/cron/abandoned-signup-recovery/route.ts.
create table if not exists public.abandoned_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  captured_at timestamptz not null default now(),
  unsubscribe_token text not null default encode(gen_random_bytes(24), 'hex'::text),
  unsubscribed_at timestamptz,
  converted_at timestamptz,
  last_sequence_step integer not null default 0,
  last_sequence_sent_at timestamptz
);

comment on table public.abandoned_signups is 'Emails captured from the signup form before signUp() completes. Drives lib/abandoned-signup-sequence.ts via app/api/cron/abandoned-signup-recovery.';
comment on column public.abandoned_signups.converted_at is 'Set once a matching profiles.email row is found -- the person actually signed up, so the recovery drip stops permanently.';
comment on column public.abandoned_signups.last_sequence_step is 'Next lib/abandoned-signup-sequence.ts step to send (0-based). Advanced by app/api/cron/abandoned-signup-recovery.';

alter table public.abandoned_signups enable row level security;
-- No policies on purpose: only ever written to by the service-role client
-- (app/api/abandoned-signup/capture and the cron above), same as
-- lead_magnet_subscribers / challenge_subscribers / anon_rate_limits.

create index if not exists idx_abandoned_signups_pending
  on public.abandoned_signups (last_sequence_step)
  where unsubscribed_at is null and converted_at is null;
