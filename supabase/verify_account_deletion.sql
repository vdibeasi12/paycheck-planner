-- supabase/verify_account_deletion.sql
--
-- Proof that a deleted account is actually gone. Run this in the Supabase SQL
-- editor AFTER deleting a test account, with that account's id and email
-- substituted below. Every row it returns is data that survived deletion.
--
-- Written Sep 12 2026 alongside 20260912140000_complete_account_deletion.sql.
-- The point of keeping it in the repo: "we fixed deletion" is a claim, and the
-- only way to keep it true as tables get added is to be able to re-check it in
-- thirty seconds. Run it after adding any table that stores user data.
--
-- Expected result when deletion is working: ZERO rows, except possibly
-- public.events, which is intentionally retained with user_id set to null (see
-- the note at the end of the migration). If events appears here with a
-- NON-NULL user_id, that is a real failure.

\set uid '00000000-0000-0000-0000-000000000000'
\set addr 'someone@example.com'

with target as (
  select :'uid'::uuid as uid, lower(:'addr') as addr
)
select * from (
  -- auth
  select 'auth.users' as location, count(*) as rows_left from auth.users, target where auth.users.id = target.uid
  union all select 'auth.mfa_factors', count(*) from auth.mfa_factors, target where auth.mfa_factors.user_id = target.uid
  union all select 'auth.identities',  count(*) from auth.identities,  target where auth.identities.user_id  = target.uid
  union all select 'auth.sessions',    count(*) from auth.sessions,    target where auth.sessions.user_id    = target.uid

  -- secrets and device identifiers: the ones that matter most
  union all select 'plaid_items (ACCESS TOKENS)', count(*) from public.plaid_items, target where plaid_items.user_id = target.uid
  union all select 'mfa_email_secrets (TOTP SECRET)', count(*) from public.mfa_email_secrets, target where mfa_email_secrets.user_id = target.uid
  union all select 'push_tokens', count(*) from public.push_tokens, target where push_tokens.user_id = target.uid

  -- bank data
  union all select 'plaid_accounts',    count(*) from public.plaid_accounts, target    where plaid_accounts.user_id = target.uid
  union all select 'plaid_liabilities', count(*) from public.plaid_liabilities, target where plaid_liabilities.user_id = target.uid
  union all select 'transactions',      count(*) from public.transactions, target      where transactions.user_id = target.uid

  -- money
  union all select 'debts',          count(*) from public.debts, target          where debts.user_id = target.uid
  union all select 'debt_payments',  count(*) from public.debt_payments, target  where debt_payments.user_id = target.uid
  union all select 'bills',          count(*) from public.bills, target          where bills.user_id = target.uid
  union all select 'income',         count(*) from public.income, target         where income.user_id = target.uid
  union all select 'paychecks',      count(*) from public.paychecks, target      where paychecks.user_id = target.uid
  union all select 'budgets',        count(*) from public.budgets, target        where budgets.user_id = target.uid
  union all select 'assets',         count(*) from public.assets, target         where assets.user_id = target.uid
  union all select 'cash_accounts',  count(*) from public.cash_accounts, target  where cash_accounts.user_id = target.uid
  union all select 'financial_goals',      count(*) from public.financial_goals, target      where financial_goals.user_id = target.uid
  union all select 'financial_snapshots',  count(*) from public.financial_snapshots, target  where financial_snapshots.user_id = target.uid
  union all select 'payoff_strategies',    count(*) from public.payoff_strategies, target    where payoff_strategies.user_id = target.uid
  union all select 'paycheck_plan_proposals',   count(*) from public.paycheck_plan_proposals, target   where paycheck_plan_proposals.user_id = target.uid
  union all select 'paycheck_plan_snapshots',   count(*) from public.paycheck_plan_snapshots, target   where paycheck_plan_snapshots.user_id = target.uid
  union all select 'paycheck_surplus_decisions',count(*) from public.paycheck_surplus_decisions, target where paycheck_surplus_decisions.user_id = target.uid

  -- content, activity, preferences
  union all select 'profiles',              count(*) from public.profiles, target              where profiles.id = target.uid
  union all select 'ai_recommendations',    count(*) from public.ai_recommendations, target    where ai_recommendations.user_id = target.uid
  union all select 'chat_messages',         count(*) from public.chat_messages, target         where chat_messages.user_id = target.uid
  union all select 'activity_logs',         count(*) from public.activity_logs, target         where activity_logs.user_id = target.uid
  union all select 'documents',             count(*) from public.documents, target             where documents.user_id = target.uid
  union all select 'university_progress',   count(*) from public.university_progress, target   where university_progress.user_id = target.uid
  union all select 'achievements',          count(*) from public.achievements, target          where achievements.user_id = target.uid
  union all select 'onboarding_progress',   count(*) from public.onboarding_progress, target   where onboarding_progress.user_id = target.uid
  union all select 'feedback',              count(*) from public.feedback, target              where feedback.user_id = target.uid
  union all select 'notification_preferences', count(*) from public.notification_preferences, target where notification_preferences.user_id = target.uid
  union all select 'subscriptions',         count(*) from public.subscriptions, target         where subscriptions.user_id = target.uid
  union all select 'api_rate_limits',       count(*) from public.api_rate_limits, target       where api_rate_limits.user_id = target.uid
  union all select 'referrals',             count(*) from public.referrals, target             where referrals.referrer_id = target.uid or referrals.referred_id = target.uid

  -- email-keyed lists: no user_id, so no cascade reaches them. These are the
  -- ones that keep MAILING a deleted user, which is why they are checked by
  -- address rather than id.
  union all select 'blog_subscribers (by email)',        count(*) from public.blog_subscribers, target        where lower(blog_subscribers.email) = target.addr
  union all select 'challenge_subscribers (by email)',   count(*) from public.challenge_subscribers, target   where lower(challenge_subscribers.email) = target.addr
  union all select 'lead_magnet_subscribers (by email)', count(*) from public.lead_magnet_subscribers, target where lower(lead_magnet_subscribers.email) = target.addr
  union all select 'abandoned_signups (by email)',       count(*) from public.abandoned_signups, target       where lower(abandoned_signups.email) = target.addr
  union all select 'university_waitlist (by email)',     count(*) from public.university_waitlist, target     where lower(university_waitlist.email) = target.addr
  union all select 'money_score_results (by email)',     count(*) from public.money_score_results, target     where lower(money_score_results.email) = target.addr

  -- Retained on purpose, but only with user_id nulled. A non-zero count here
  -- means the anonymisation did NOT happen and the rows are still attributed.
  union all select 'events (SHOULD BE 0 - retained only anonymised)', count(*) from public.events, target where events.user_id = target.uid
) q
where rows_left > 0
order by rows_left desc;
