-- Post-signup onboarding email funnel (Day 1/3/5/7/14). Progress is tracked
-- directly on profiles rather than a separate subscribers table -- this
-- drip is for signed-up accounts, not anonymous leads -- mirroring the
-- last_sequence_step pattern from lead_magnet_subscribers (see
-- 20260812161557_add_lead_magnet_drip.sql). Elapsed time is measured from
-- profiles.created_at, so no separate "subscribed_at" column is needed.
-- The Day-0 welcome email is unaffected -- it's still sent synchronously at
-- signup by lib/sendWelcomeEmail.ts; this sequence starts at Day 1.
alter table public.profiles
  add column if not exists onboarding_sequence_step integer not null default 0,
  add column if not exists onboarding_sequence_sent_at timestamptz,
  add column if not exists onboarding_unsubscribed boolean not null default false,
  add column if not exists onboarding_unsub_token text not null default encode(gen_random_bytes(24), 'hex'::text);

comment on column public.profiles.onboarding_sequence_step is 'Next lib/onboarding-sequence.ts step to send (0-based). Advanced by app/api/cron/onboarding-drip.';
comment on column public.profiles.onboarding_sequence_sent_at is 'Timestamp of the most recently sent onboarding drip email.';
comment on column public.profiles.onboarding_unsubscribed is 'True once the user clicks unsubscribe on an onboarding drip email. Does not affect transactional email.';
comment on column public.profiles.onboarding_unsub_token is 'Opaque token for the one-click unsubscribe link in onboarding drip emails.';

create index if not exists idx_profiles_onboarding_pending
  on public.profiles (onboarding_sequence_step)
  where onboarding_unsubscribed = false;
