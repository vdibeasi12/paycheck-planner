-- Plan Drift (Aug 26 2026)
--
-- One snapshot row per (user, paycheck cycle): the ORIGINAL computed
-- breakdown (bills/debts/goals/flexible) for a cycle, captured the moment
-- that cycle starts -- before the user has a chance to edit anything. The
-- "current" side of the comparison is never stored; it's recomputed live
-- from today's real bills/debts/goals for that same cycle window
-- (lib/planDrift.ts's computeCurrentBreakdown, same anchor-just-before-the-
-- cycle trick already used by lib/paycheckSurplus.ts and
-- lib/paycheckAutopilot.ts). Drift is the diff between the two.
--
-- Deliberately does NOT fold in debt_payments or paycheck_surplus_decisions
-- rows -- an earlier draft of this feature tried blending those in as
-- "actuals," but a surplus decision's own cycle_date is the CLOSED cycle the
-- leftover money came from, not the newly-STARTING cycle this snapshot
-- describes, so mixing them in attributed money to the wrong cycle. Surplus
-- already shows the user that outcome in its own UI; Plan Drift stays
-- scoped to "did the bills/debts/goals records themselves change" for one
-- cycle's own window.

create table if not exists public.paycheck_plan_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_date date not null,
  amount numeric not null,
  bills_amount numeric not null default 0,
  debts_amount numeric not null default 0,
  goals_amount numeric not null default 0,
  flexible_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, cycle_date)
);

alter table public.paycheck_plan_snapshots enable row level security;

create policy "plan_snapshots_select_own" on public.paycheck_plan_snapshots
  for select using (auth.uid() = user_id);
create policy "plan_snapshots_insert_own" on public.paycheck_plan_snapshots
  for insert with check (auth.uid() = user_id);

create index if not exists idx_plan_snapshots_user_cycle
  on public.paycheck_plan_snapshots (user_id, cycle_date desc);
