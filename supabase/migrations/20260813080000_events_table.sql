-- Minimal product/marketing events table (Admin Phase 1). Deliberately not a
-- full analytics pipeline: a handful of high-value funnel points, written
-- server-side (or from SECURITY DEFINER triggers for the two events that
-- must never be missable -- signup and referral completion). No client-side
-- writes, no page-view tracking yet; add those later if this proves useful.
--
-- Same posture as admin_audit_log: RLS on, no policies. Only the
-- service-role client (lib/track.ts) and the two triggers below write here;
-- only the admin API reads it.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_name text not null,
  user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists events_event_name_created_at_idx
  on public.events (event_name, created_at desc);
create index if not exists events_user_id_idx on public.events (user_id);

alter table public.events enable row level security;
-- No policies on purpose -- service_role (and SECURITY DEFINER triggers,
-- which run as the function owner) bypass RLS; anon/authenticated get
-- nothing, same as admin_audit_log.

-- Extend handle_new_user to fire a 'signup_completed' event exactly once per
-- real signup, regardless of which flow completed it (password, Google
-- OAuth, magic link all insert into auth.users the same way). Guarded by
-- FOUND so a retried/duplicate trigger fire (profile already exists) doesn't
-- double-count. This is the one signup counter that can't silently drift
-- from reality, since it's the same trigger that creates the profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;

  if found then
    insert into public.events (event_name, user_id, metadata)
    values ('signup_completed', new.id, '{}'::jsonb);
  end if;

  return new;
end;
$function$;

-- Extend handle_referral_completion to fire a 'referral_completed' event the
-- moment a pending referral flips to completed (referred user finished
-- onboarding), before any reward logic runs. Reward-granted or not, the
-- completion itself is the marketing signal worth counting.
create or replace function public.handle_referral_completion()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  ref_row record;
  referrer_completed_count int;
begin
  if (old.onboarded is distinct from new.onboarded) and new.onboarded = true then
    select * into ref_row from public.referrals where referred_id = new.id and status = 'pending';

    if found then
      update public.referrals
      set status = 'completed', completed_at = now()
      where id = ref_row.id;

      insert into public.events (event_name, user_id, metadata)
      values ('referral_completed', new.id, jsonb_build_object('referrer_id', ref_row.referrer_id));

      perform set_config('request.jwt.claim.role', 'service_role', true);

      if not ref_row.referred_reward_granted then
        update public.profiles
        set plan = 'starter'
        where id = new.id and plan = 'free';

        update public.referrals
        set referred_reward_granted = true
        where id = ref_row.id;
      end if;

      select count(*) into referrer_completed_count
      from public.referrals
      where referrer_id = ref_row.referrer_id and status = 'completed';

      if referrer_completed_count >= 3 then
        update public.profiles
        set plan = 'starter', referral_reward_granted = true
        where id = ref_row.referrer_id and plan = 'free' and referral_reward_granted = false;
      end if;
    end if;
  end if;

  return new;
end;
$function$;
