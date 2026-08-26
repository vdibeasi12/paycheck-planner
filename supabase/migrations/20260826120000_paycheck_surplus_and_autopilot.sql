-- Paycheck Surplus + Plan Autopilot (Aug 26 2026)
--
-- Two new tables supporting two related features:
--   1. Paycheck Surplus -- when a paycheck cycle closes with money left over
--      (per lib/paycheckSurplus.ts, itself built on the existing
--      lib/safeToSpend.ts projection), the user is asked what should happen
--      to it. One decision row per (user, closed cycle date).
--   2. Plan Autopilot -- a few days before a predicted payday, Autopilot-tier
--      users get an auto-generated preview of what that paycheck will need
--      to cover (lib/paycheckAutopilot.ts, built on the existing
--      lib/paycheckCycles.ts projection engine). One proposal row per (user,
--      upcoming cycle date).
--
-- Neither table stores a persisted, user-editable "budget" -- both are
-- derived from the real bills/debts/goals records and just snapshot that
-- derived breakdown at a point in time, same reasoning as why Safe-to-Spend
-- doesn't claim a live bank balance.

create table if not exists public.paycheck_surplus_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_date date not null,
  surplus_amount numeric not null,
  decision text check (decision in ('debt', 'next_paycheck', 'buffer', 'goal', 'cushion')),
  target_debt_id uuid references public.debts(id) on delete set null,
  target_goal_id uuid references public.financial_goals(id) on delete set null,
  applied_amount numeric,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (user_id, cycle_date)
);

alter table public.paycheck_surplus_decisions enable row level security;

create policy "surplus_select_own" on public.paycheck_surplus_decisions
  for select using (auth.uid() = user_id);
create policy "surplus_insert_own" on public.paycheck_surplus_decisions
  for insert with check (auth.uid() = user_id);
create policy "surplus_update_own" on public.paycheck_surplus_decisions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_surplus_decisions_user_unresolved
  on public.paycheck_surplus_decisions (user_id)
  where resolved = false;

create table if not exists public.paycheck_plan_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_date date not null,
  amount numeric not null,
  bills_amount numeric not null default 0,
  debts_amount numeric not null default 0,
  goals_amount numeric not null default 0,
  flexible_amount numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (user_id, cycle_date)
);

alter table public.paycheck_plan_proposals enable row level security;

create policy "autopilot_select_own" on public.paycheck_plan_proposals
  for select using (auth.uid() = user_id);
create policy "autopilot_insert_own" on public.paycheck_plan_proposals
  for insert with check (auth.uid() = user_id);
create policy "autopilot_update_own" on public.paycheck_plan_proposals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_autopilot_proposals_user_pending
  on public.paycheck_plan_proposals (user_id)
  where status = 'pending';
