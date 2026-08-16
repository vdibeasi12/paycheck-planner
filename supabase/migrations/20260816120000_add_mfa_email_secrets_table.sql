-- Documents a table that already exists live (created directly via the
-- Supabase MCP during earlier MFA-email work, without a matching migration
-- file) -- adding this so the schema is reproducible from migrations alone,
-- per "use proper migrations, do not manually alter production data."
-- `create table if not exists` makes this a no-op against the live
-- database; it exists so a fresh environment ends up with the same shape.
--
-- Holds the encrypted TOTP secret for a user who chose "email me a code
-- instead" at MFA enrollment (app/components/MfaSetup.tsx) -- see
-- lib/mfaEmail.ts for why storing this is safe: it's the SAME secret
-- Supabase already handed the client once at enroll() time, captured here
-- only so the app can compute the current code server-side and email it,
-- rather than expecting the user to have it in an authenticator app.
-- Service-role only: RLS is enabled with zero policies, so no
-- anon/authenticated client can read or write this table under any
-- circumstance -- only app/api/mfa/email/enroll and app/api/mfa/email/send
-- (both server-only, using the service-role client) ever touch it.
create table if not exists public.mfa_email_secrets (
  user_id uuid not null references auth.users(id) on delete cascade,
  factor_id uuid not null,
  secret_encrypted text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, factor_id)
);

alter table public.mfa_email_secrets enable row level security;
-- No policies on purpose -- service-role bypasses RLS entirely, and no
-- other role should ever be able to read a stored TOTP secret.
