-- Rate limiting for anonymous public endpoints (email-capture subscribe
-- forms: blog, challenge, lead-magnet, university). The existing
-- check_and_increment_rate_limit() requires auth.uid() and returns false
-- for anonymous callers, so it can't be reused here -- these forms are hit
-- by logged-out visitors by design. Keyed by IP instead of user_id.
--
-- Unlike check_and_increment_rate_limit, this is NOT granted to
-- anon/authenticated: it's only ever called server-side (via the
-- service-role client already used by every subscribe route), so there's
-- no legitimate reason for a client to invoke it directly over RPC -- the
-- same class of unnecessary exposure closed elsewhere in this audit.

create table if not exists public.anon_rate_limits (
  ip text not null,
  bucket text not null,
  window_start timestamptz not null default now(),
  count integer not null default 0,
  primary key (ip, bucket)
);

alter table public.anon_rate_limits enable row level security;
-- No policies on purpose: only the function below (service_role only) writes here.

create or replace function public.check_and_increment_anon_rate_limit(p_bucket text, p_ip text)
returns boolean
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_now timestamptz := now();
  v_limit integer := 5;
  v_window integer := 3600; -- 5 requests / hour / IP / bucket
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
        when rl.window_start < v_now - make_interval(secs => v_window) then v_now
        else rl.window_start
      end,
      count = case
        when rl.window_start < v_now - make_interval(secs => v_window) then 1
        else rl.count + 1
      end
  returning rl.count into v_count;

  return v_count <= v_limit;
end;
$func$;

revoke all on function public.check_and_increment_anon_rate_limit(text, text) from public;
grant execute on function public.check_and_increment_anon_rate_limit(text, text) to service_role;
