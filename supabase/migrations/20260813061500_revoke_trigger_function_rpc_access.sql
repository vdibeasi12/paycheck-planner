-- Supabase's security advisor flagged several SECURITY DEFINER functions as
-- directly callable by anon/authenticated via PostgREST RPC
-- (/rest/v1/rpc/<function>). Checked against actual app code (grep for
-- `.rpc(`): only `check_and_increment_rate_limit` and `registered_member_count`
-- are ever called that way on purpose. The other five are pure trigger
-- functions (invoked automatically by Postgres on insert/update -- trigger
-- execution does not require EXECUTE privilege on the function itself) with
-- no legitimate direct-call use case. Leaving them RPC-callable meant anyone
-- could invoke e.g. prevent_self_privilege_escalation() or
-- handle_referral_completion() out of band. Revoking direct EXECUTE closes
-- that without affecting their normal trigger behavior.

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.enforce_debt_limit() from anon, authenticated;
revoke execute on function public.handle_referral_completion() from anon, authenticated;
revoke execute on function public.prevent_self_privilege_escalation() from anon, authenticated;
revoke execute on function public.rls_auto_enable() from anon, authenticated;
