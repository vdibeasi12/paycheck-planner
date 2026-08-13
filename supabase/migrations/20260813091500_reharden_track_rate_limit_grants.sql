-- Same gotcha documented in 20260813081500_reharden_internal_function_execute_grants.sql:
-- Supabase's project-level default privileges grant anon/authenticated
-- EXECUTE on a function as separate ACL entries at creation time, so a
-- revoke bundled into the same migration that (re)creates the function
-- doesn't reliably hold -- confirmed empirically here too via
-- has_function_privilege immediately after 20260813090000 applied (came
-- back anon_exec=true, auth_exec=true despite that migration's own revoke).
-- Re-revoke as a standalone follow-up statement, verified clean afterward.
revoke all on function public.check_and_increment_anon_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_and_increment_anon_rate_limit(text, text, integer, integer) to service_role;
