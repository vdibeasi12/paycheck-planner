-- QA follow-up (Sep 3 2026, Vince): the multi-account "add any number of
-- accounts, link or type in a balance" model shipped earlier today never
-- got real use (table is empty) and doesn't match what actually solves the
-- accuracy problem. What's needed instead: exactly one Checking balance and
-- one Savings balance, entered manually (no Plaid Auth needed), each with a
-- balance_as_of date -- so the app can PROJECT that balance forward to today
-- using the income/bills/debts already on file (see
-- lib/paycheckCycles.ts's projectRunningBalance) instead of going stale the
-- moment the user stops re-checking their bank. Replaces the prior
-- cash_accounts shape entirely (zero rows in use, safe to redefine).
drop table if exists public.cash_accounts;

create table public.cash_accounts (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('checking', 'savings')),
  balance numeric(12,2) not null default 0,
  balance_as_of date not null default current_date,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.cash_accounts enable row level security;

create policy cash_accounts_select_own on public.cash_accounts
  for select using (auth.uid() = user_id);
create policy cash_accounts_insert_own on public.cash_accounts
  for insert with check (auth.uid() = user_id);
create policy cash_accounts_update_own on public.cash_accounts
  for update using (auth.uid() = user_id);
create policy cash_accounts_delete_own on public.cash_accounts
  for delete using (auth.uid() = user_id);
