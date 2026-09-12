-- Complete account deletion.
--
-- Sep 12 2026, Vince: "I want to make sure when a user deletes their data
-- everything is wiped." Prompted by finding two orphaned public.income rows
-- belonging to user 92a89f74-2642-4735-b9ed-2f344f04abc3, who no longer
-- exists in auth.users.
--
-- WHAT WAS ACTUALLY WRONG (audited against the live schema, not assumed):
--
-- 31 tables already have ON DELETE CASCADE to auth.users, so the delete route
-- in app/api/account/delete/route.ts -- purge function, then
-- auth.admin.deleteUser() -- does clean most things up today. The gaps are
-- narrow but real:
--
--   1. income, subscriptions and profiles have NO foreign key to auth.users
--      at all. The purge function deletes them by hand, so the account-delete
--      ROUTE is fine -- but any other path is not. Delete a user from the
--      Supabase dashboard, or with the admin API, or from a future admin
--      route, and their income rows are simply left behind. That is exactly
--      how the 92a89f74 rows survived, and income is not incidental data: it
--      is the user's pay history.
--
--   2. Four tables are keyed by EMAIL with no user_id, so no cascade can ever
--      reach them and the purge function never mentioned them:
--      abandoned_signups, lead_magnet_subscribers, money_score_results and
--      university_waitlist. A user who deletes their account stays on those
--      lists with their email address intact -- which means the drip crons
--      (lead-magnet-drip, abandoned-signup-recovery, challenge-drip) keep
--      emailing someone who has deleted their account. That is the worst
--      version of this bug: not just data retained, but data still being
--      acted on.
--
--   3. The purge function covered 20 tables and had drifted badly behind the
--      schema -- it never mentioned cash_accounts, plaid_items,
--      plaid_accounts, plaid_liabilities, transactions, push_tokens,
--      mfa_email_secrets, university_progress, api_rate_limits, the three
--      paycheck_* tables or referrals. Cascades happened to cover those, so
--      nothing broke, but the function was silently load-bearing for only
--      part of what it claimed to do. Two of those tables hold secrets:
--      plaid_items.access_token and mfa_email_secrets.secret_encrypted.
--
-- The fix is both belts and braces: make the function complete AND make the
-- schema enforce it, so a deletion by any route is total.
--
-- events is deliberately left alone: its FK is ON DELETE SET NULL, which
-- anonymises the analytics row rather than destroying the aggregate. That is
-- a real choice, not an oversight. See the note at the end.

begin;

-- ---------------------------------------------------------------------------
-- 1. Clear existing orphans so the constraints below can be created.
--    These rows belong to users who no longer exist; there is nobody left who
--    could want them. Verified before writing this: 2 rows, both in income.
-- ---------------------------------------------------------------------------
delete from public.income
 where user_id is not null
   and user_id not in (select id from auth.users);

delete from public.subscriptions
 where user_id is not null
   and user_id not in (select id from auth.users);

delete from public.profiles
 where id not in (select id from auth.users);

-- ---------------------------------------------------------------------------
-- 2. The three missing foreign keys.
--    With these, deleting an auth user cleans up from ANY path -- the app, the
--    admin API, the Supabase dashboard -- instead of only from the one route
--    that remembers to call the purge function.
--
--    profiles is the important one beyond itself: achievements and
--    onboarding_progress already cascade FROM profiles, so they have been
--    relying on the purge function reaching profiles by hand.
-- ---------------------------------------------------------------------------
alter table public.income
  drop constraint if exists income_user_id_fkey,
  add constraint income_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.subscriptions
  drop constraint if exists subscriptions_user_id_fkey,
  add constraint subscriptions_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.profiles
  drop constraint if exists profiles_id_fkey,
  add constraint profiles_id_fkey
    foreign key (id) references auth.users(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 3. A purge function that actually purges.
--
--    Every user-owned table, in FK-safe order, plus the email-keyed lists that
--    no cascade can reach. Still SECURITY DEFINER and still called with the
--    caller's own id by app/api/account/delete/route.ts, which takes that id
--    from the session cookie and never from the request body.
--
--    The email lookup runs against auth.users BEFORE the user is deleted --
--    the route calls this first and auth.admin.deleteUser() second, so the row
--    is still there. If that order is ever reversed, the email-keyed deletes
--    below silently stop working, so do not reverse it.
-- ---------------------------------------------------------------------------
create or replace function public.app_admin_purge_user(p_uid uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = p_uid;

  -- Bank connections first. plaid_accounts and plaid_liabilities cascade from
  -- plaid_items, but they are deleted explicitly anyway so this function does
  -- not depend on a cascade staying in place to be correct.
  delete from public.plaid_liabilities where user_id = p_uid;
  delete from public.plaid_accounts    where user_id = p_uid;
  delete from public.plaid_items       where user_id = p_uid;
  delete from public.transactions      where user_id = p_uid;

  -- Money. debt_payments before debts (FK), everything before cash_accounts
  -- (bills/debts/income reference it ON DELETE SET NULL, so order is not
  -- strictly required, but deleting the children first keeps it honest).
  delete from public.debt_payments             where user_id = p_uid;
  delete from public.debts                     where user_id = p_uid;
  delete from public.bills                     where user_id = p_uid;
  delete from public.income                    where user_id = p_uid;
  delete from public.paychecks                 where user_id = p_uid;
  delete from public.budgets                   where user_id = p_uid;
  delete from public.assets                    where user_id = p_uid;
  delete from public.cash_accounts             where user_id = p_uid;
  delete from public.paycheck_surplus_decisions where user_id = p_uid;
  delete from public.paycheck_plan_proposals   where user_id = p_uid;
  delete from public.paycheck_plan_snapshots   where user_id = p_uid;
  delete from public.financial_goals           where user_id = p_uid;
  delete from public.financial_snapshots       where user_id = p_uid;
  delete from public.payoff_strategies         where user_id = p_uid;

  -- Content and activity.
  delete from public.ai_recommendations  where user_id = p_uid;
  delete from public.chat_messages       where user_id = p_uid;
  delete from public.activity_logs       where user_id = p_uid;
  delete from public.documents           where user_id = p_uid;
  delete from public.university_progress where user_id = p_uid;
  delete from public.achievements        where user_id = p_uid;
  delete from public.onboarding_progress where user_id = p_uid;
  delete from public.feedback            where user_id = p_uid;
  delete from public.referrals           where referrer_id = p_uid or referred_id = p_uid;

  -- Credentials and device identifiers. These two hold secrets --
  -- plaid_items.access_token above, and the TOTP secret here -- so they are
  -- the last things that should ever be left behind.
  delete from public.mfa_email_secrets where user_id = p_uid;
  delete from public.push_tokens       where user_id = p_uid;
  delete from public.api_rate_limits   where user_id = p_uid;

  -- Preferences and billing.
  delete from public.notification_preferences where user_id = p_uid;
  delete from public.subscriptions            where user_id = p_uid;

  -- Email-keyed marketing lists. No user_id on several of these, so no
  -- cascade can reach them; without this block a deleted user keeps receiving
  -- drip email (see app/api/cron/lead-magnet-drip, abandoned-signup-recovery,
  -- challenge-drip).
  if v_email is not null and length(v_email) > 0 then
    delete from public.blog_subscribers        where user_id = p_uid or lower(email) = lower(v_email);
    delete from public.challenge_subscribers   where user_id = p_uid or lower(email) = lower(v_email);
    delete from public.lead_magnet_subscribers where lower(email) = lower(v_email);
    delete from public.abandoned_signups       where lower(email) = lower(v_email);
    delete from public.university_waitlist     where lower(email) = lower(v_email);
    delete from public.money_score_results     where lower(email) = lower(v_email);
  else
    delete from public.blog_subscribers      where user_id = p_uid;
    delete from public.challenge_subscribers where user_id = p_uid;
  end if;

  -- Anchor last: achievements and onboarding_progress cascade from this.
  delete from public.profiles where id = p_uid;

  -- public.events is deliberately NOT deleted. Its FK is ON DELETE SET NULL,
  -- which detaches the row from the person while leaving the aggregate
  -- (signups, page views, conversion counts) intact. If the retention policy
  -- ever changes to "delete means delete, including analytics", change that
  -- constraint to ON DELETE CASCADE rather than adding a delete here -- the
  -- constraint is what makes it true on every path.
end;
$function$;

commit;
