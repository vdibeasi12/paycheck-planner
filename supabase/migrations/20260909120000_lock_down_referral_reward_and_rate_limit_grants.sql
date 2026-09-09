-- Sep 9 2026 security audit (Vince: "check for errors and security issues").
--
-- (1) grant_or_extend_referral_reward(target_id uuid) -- REAL exposure.
-- Added in 20260822150000_referral_reward_one_month.sql as an internal
-- helper meant to run only from the handle_referral_completion trigger. It
-- is SECURITY DEFINER and does no ownership/referral check on target_id at
-- all -- it just trusts its caller. A prior migration
-- (20260813061500_revoke_trigger_function_rpc_access.sql) already revoked
-- direct PostgREST RPC access for five other trigger-only functions for
-- exactly this reason, but this function didn't exist yet at the time and
-- was missed. As shipped, ANY anon or authenticated caller can hit
-- /rest/v1/rpc/grant_or_extend_referral_reward with an arbitrary target_id
-- and grant/extend that account 30 free days of the Momentum ("starter")
-- plan, repeatedly, without ever completing a real referral. Revoking direct
-- EXECUTE closes this without touching its normal trigger behavior --
-- trigger execution doesn't require EXECUTE privilege on the function
-- itself (same reasoning as the Aug 13 migration).
revoke execute on function public.grant_or_extend_referral_reward(uuid) from anon, authenticated;

-- (2) check_and_increment_rate_limit(text) -- defense-in-depth, not
-- currently exploitable. 20260629181237_api_rate_limits.sql ran
-- `revoke all ... from public; grant execute ... to authenticated,
-- service_role;`, but Supabase's default privileges grant new-function
-- EXECUTE directly to the anon/authenticated roles, not through the
-- "public" pseudo-role -- so that revoke never actually touched anon's
-- access, and the live grant list still includes anon today. The function
-- itself is safe either way (it returns false immediately when
-- auth.uid() is null, before touching any table), but tightening the
-- grant to match original intent removes the discrepancy outright.
revoke execute on function public.check_and_increment_rate_limit(text) from anon;

-- (3) generate_referral_code() / set_referral_code() -- flagged by the
-- Supabase advisor for a mutable search_path. Both already fully
-- schema-qualify every object they touch (public.profiles,
-- extensions.gen_random_bytes -- the latter is the Aug 21 fix for the
-- signup-breaking bug, confirmed still present), so this isn't actually
-- exploitable today, but pinning search_path explicitly removes the
-- warning and any future risk if someone adds an unqualified reference
-- later.
alter function public.generate_referral_code() set search_path = public, extensions;
alter function public.set_referral_code() set search_path = public, extensions;

-- (4) test_table -- RLS-enabled-no-policy per the advisor, and confirmed
-- unused: nothing in the codebase reads or writes it, and it has no foreign
-- key relationships in either direction. Leftover from early development.
drop table if exists public.test_table;
