-- Replaces the single-row cash_balance table (shipped same day, zero rows
-- in use) with a multi-account model. One manual/linked balance can't
-- represent a real household: bills might come out of one bank while a
-- mortgage/car/personal loan come out of another. cash_accounts lets the
-- user list every account that money for upcoming bills/debts actually
-- comes from, and Safe to Spend sums all of them -- deliberately excluding
-- dedicated savings/goal accounts, which stay tracked via a linked
-- Financial Goal (lib/goalAutoCalc.ts) instead of counting as spendable.

drop table if exists public.cash_balance;

create table if not exists public.cash_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  manual_balance numeric(12,2),
  manual_balance_updated_at timestamptz,
  linked_account_label text,
  linked_starting_balance numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

create index if not exists cash_accounts_user_id_idx on public.cash_accounts(user_id);
