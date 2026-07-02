create table if not exists public.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null default now(),
  count integer not null default 0,
  primary key (user_id, bucket)
);

alter table public.api_rate_limits enable row level security;
-- No policies on purpose: only the SECURITY DEFINER function below writes here.

create or replace function public.check_and_increment_rate_limit(p_bucket text)
returns boolean
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  v_limit integer;
  v_window integer;
  v_count integer;
begin
  if v_user is null then
    return false;
  end if;

  -- Per-bucket limits (fixed server-side; clients cannot raise them).
  if p_bucket = 'ai' then
    v_limit := 20; v_window := 3600;      -- 20 insights / hour
  elsif p_bucket = 'chat' then
    v_limit := 40; v_window := 3600;      -- 40 chat messages / hour
  else
    v_limit := 20; v_window := 3600;
  end if;

  insert into public.api_rate_limits as rl (user_id, bucket, window_start, count)
  values (v_user, p_bucket, v_now, 1)
  on conflict (user_id, bucket) do update
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

revoke all on function public.check_and_increment_rate_limit(text) from public;
grant execute on function public.check_and_increment_rate_limit(text) to authenticated, service_role;
