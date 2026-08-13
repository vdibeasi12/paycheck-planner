-- The earlier lockdown (20260813033503_revoke_trigger_function_rpc_access)
-- revoked EXECUTE from anon/authenticated on these functions, but
-- get_advisors now shows all five still executable by anon and
-- authenticated -- the revoke didn't hold (likely superseded by a later
-- default-privilege grant on this project; the mechanism isn't fully
-- diagnosed, so this re-applies the revoke explicitly per-function rather
-- than relying on schema-level defaults, and should be re-verified with
-- get_advisors after any future migration that touches these functions).
--
-- Three of these (enforce_debt_limit, prevent_self_privilege_escalation,
-- rls_auto_enable) are trigger/event-trigger functions that would error if
-- invoked directly via RPC anyway (they need NEW/OLD/TG_* trigger context),
-- so the practical exposure there is low. handle_new_user and
-- handle_referral_completion are the same. check_and_increment_anon_rate_limit
-- is the one with real impact: it's a plain callable function, and with
-- anon/authenticated able to call it directly, anyone could invoke it with
-- an arbitrary ip/bucket pair, bypassing the "service-role only, called
-- from the subscribe routes" design from today's rate-limiting migration.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_debt_limit() from public, anon, authenticated;
revoke execute on function public.handle_referral_completion() from public, anon, authenticated;
revoke execute on function public.prevent_self_privilege_escalation() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.check_and_increment_anon_rate_limit(text, text) from public, anon, authenticated;

-- Re-affirm the only grants these actually need: postgres (owner, needed to
-- fire as a trigger/event-trigger) and service_role (for
-- check_and_increment_anon_rate_limit, called from lib/anonRateLimit.ts).
grant execute on function public.check_and_increment_anon_rate_limit(text, text) to service_role;
