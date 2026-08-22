-- Change the referral reward from a permanent upgrade (referrer needed 3
-- completed referrals; referred user's bump never expired) to a time-boxed
-- one: refer ONE friend, and once they finish onboarding, BOTH of you get a
-- free month of Momentum. This matches the actual growth-plan design
-- (docs/marketing discussion, Aug 21-22) rather than the original
-- implementation's "invite 3 friends, everyone keeps it forever".
--
-- referral_reward_expires_at tracks when a referral-granted Momentum month
-- ends. It's deliberately a single column, not one row per grant: someone
-- who keeps referring friends should keep extending their free time rather
-- than each new referral silently no-op'ing after the first one did
-- something. A separate cron (app/api/cron/referral-reward-expiry) reads
-- this column daily to revert the plan once it lapses.
--
-- referral_reward_granted is kept as-is (a one-time "has this person ever
-- earned a referral reward" marker for admin/analytics) but no longer gates
-- whether a reward is granted -- grant_or_extend_referral_reward below runs
-- on every completed referral now, not just the first.

alter table public.profiles
  add column if not exists referral_reward_expires_at timestamptz;

-- Grants (or extends) one month of Momentum for a referral reward. Never
-- touches someone with a real, active paid subscription -- a referral
-- reward is a courtesy on top of the free tier, not a discount on top of
-- money someone is already paying. Extends from the current expiry (if
-- still in the future) rather than from now(), so a second referral while
-- the first month is still active adds a full 30 days on top, not just
-- resets the clock.
create or replace function public.grant_or_extend_referral_reward(target_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  target record;
begin
  select plan, subscription_status, referral_reward_expires_at
  into target
  from public.profiles
  where id = target_id
  for update;

  if not found then
    return;
  end if;

  -- Never override a real paying customer's plan.
  if target.subscription_status = 'active' then
    return;
  end if;

  -- Only ever act on someone who is on the free tier, or already riding a
  -- referral-granted Momentum month (plan = starter with an expiry set) --
  -- never touch a plan set some other way (e.g. an admin comp, or a
  -- higher tier granted for a different reason).
  if target.plan not in ('free', 'starter') then
    return;
  end if;
  if target.plan = 'starter' and target.referral_reward_expires_at is null then
    return;
  end if;

  update public.profiles
  set plan = 'starter',
      referral_reward_expires_at =
        greatest(coalesce(target.referral_reward_expires_at, now()), now()) + interval '30 days'
  where id = target_id;
end;
$function$;

create or replace function public.handle_referral_completion()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  ref_row record;
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

      -- Referred friend's free month (still gated to fire once per referral row).
      if not ref_row.referred_reward_granted then
        perform public.grant_or_extend_referral_reward(new.id);

        update public.referrals
        set referred_reward_granted = true
        where id = ref_row.id;
      end if;

      -- Referrer's free month -- now unlocks after just 1 completed
      -- referral (was 3), and extends on every subsequent one rather than
      -- granting once and ignoring the rest.
      perform public.grant_or_extend_referral_reward(ref_row.referrer_id);

      update public.profiles
      set referral_reward_granted = true
      where id = ref_row.referrer_id and referral_reward_granted = false;
    end if;
  end if;

  return new;
end;
$function$;
