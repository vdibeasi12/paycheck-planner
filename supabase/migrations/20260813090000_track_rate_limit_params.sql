-- Admin Phase 3, part 1: let check_and_increment_anon_rate_limit take an
-- optional per-call limit/window instead of the hardcoded 5/hour that's
-- right for email-capture forms but far too strict for page-view tracking
-- (a real visitor loading a handful of pages in one session would get
-- throttled). Backward compatible: new params are appended with the same
-- defaults (5, 3600) the function already had, so every existing 2-arg call
-- site (blog/challenge/lead-magnet/university subscribe routes) behaves
-- exactly as before.

-- Postgres treats a different argument count as a distinct overload, so a
-- plain "create or replace" here would leave the old 2-arg function in
-- place *and* add this one, and a 2-arg call would keep resolving to the
-- old (unmodified) function. Drop the old signature explicitly first so
-- there's exactly one function and 2-arg callers pick up the new defaults.
drop function if exists public.check_and_increment_anon_rate_limit(text, text);

create or replace function public.check_and_increment_anon_rate_limit(
  p_bucket text,
  p_ip text,
  p_limit integer default 5,
  p_window integer default 3600
)
returns boolean
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  if p_ip is null or p_ip = '' then
    return true; -- can't rate-limit what we can't identify; fail open
  end if;

  insert into public.anon_rate_limits as rl (ip, bucket, window_start, count)
  values (p_ip, p_bucket, v_now, 1)
  on conflict (ip, bucket) do update
    set
      window_start = case
        when rl.window_start < v_now - make_interval(secs => p_window) then v_now
        else rl.window_start
      end,
      count = case
        when rl.window_start < v_now - make_interval(secs => p_window) then 1
        else rl.count + 1
      end
  returning rl.count into v_count;

  return v_count <= p_limit;
end;
$func$;

revoke all on function public.check_and_increment_anon_rate_limit(text, text, integer, integer) from public;
grant execute on function public.check_and_increment_anon_rate_limit(text, text, integer, integer) to service_role;
