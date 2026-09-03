-- Real (read-only) balance visibility for Safe to Spend / Survival Mode.
-- Plaid Auth (live checking balance) was denied for Production -- see
-- lib/csvImport.ts's header comment -- so Safe to Spend has always
-- projected a starting-cash figure from "your last paycheck" rather than
-- knowing an actual balance. This table lets a user optionally ground that
-- projection in reality instead, two ways:
--   1) manual_balance -- a number they type in themselves whenever they
--      check their real bank balance.
--   2) linked_account_label + linked_starting_balance -- the same
--      mechanism as a linked savings Goal (see lib/goalAutoCalc.ts):
--      starting_balance + the net of every transaction imported under that
--      account label = a transaction-verified running balance, no live
--      bank connection required.
-- Never used to move money -- read-only visibility into what's already
-- there. One row per user. Resolution order (most to least accurate) lives
-- in lib/cashBalance.ts's resolveStartingCash().
create table if not exists public.cash_balance (
  user_id uuid primary key references auth.users(id) on delete cascade,
  manual_balance numeric(12,2),
  manual_balance_updated_at timestamptz,
  linked_account_label text,
  linked_starting_balance numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.cash_balance enable row level security;

create policy cash_balance_select_own on public.cash_balance
  for select using (auth.uid() = user_id);
create policy cash_balance_insert_own on public.cash_balance
  for insert with check (auth.uid() = user_id);
create policy cash_balance_update_own on public.cash_balance
  for update using (auth.uid() = user_id);
create policy cash_balance_delete_own on public.cash_balance
  for delete using (auth.uid() = user_id);
