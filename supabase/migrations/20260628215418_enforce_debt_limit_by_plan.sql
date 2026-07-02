create or replace function public.enforce_debt_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_plan text;
  v_is_admin boolean;
  v_max int;
  v_count int;
begin
  -- Plaid-imported debts are never blocked: bank sync is an Autopilot
  -- (unlimited) feature and runs server-side.
  if new.source = 'plaid' then
    return new;
  end if;

  select plan, coalesce(is_admin, false)
    into v_plan, v_is_admin
  from public.profiles
  where id = new.user_id;

  -- Admins act as the top (unlimited) tier everywhere.
  if coalesce(v_is_admin, false) then
    return new;
  end if;

  -- Mirror lib/permissions.ts getMaxDebts(): free=3, starter=10, premium/connected=unlimited.
  v_max := case coalesce(v_plan, 'free')
    when 'free' then 3
    when 'starter' then 10
    else 2147483647
  end;

  if v_max >= 2147483647 then
    return new;
  end if;

  select count(*) into v_count
  from public.debts
  where user_id = new.user_id;

  if v_count >= v_max then
    raise exception 'DEBT_LIMIT_REACHED: your plan allows up to % debts', v_max
      using errcode = '23514';
  end if;

  return new;
end;
$func$;

drop trigger if exists trg_enforce_debt_limit on public.debts;

create trigger trg_enforce_debt_limit
  before insert on public.debts
  for each row
  execute function public.enforce_debt_limit();
