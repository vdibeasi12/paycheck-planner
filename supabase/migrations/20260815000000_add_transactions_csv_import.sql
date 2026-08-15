-- CSV import (Autopilot Phase 1 data-strategy pivot, Aug 15 2026). See
-- /areas/paycheck-planner.md and lib/csvImport.ts for background: Plaid Auth
-- was denied for Production, so this gives Autopilot/Accelerate users a
-- zero-Plaid-cost way to bulk-fill transactions, bills, and income from a
-- bank CSV export.

-- Raw (deduped) imported transactions. Independent of bills/income so a
-- user's full spending history survives even for one-off transactions that
-- never became a recurring bill/income row.
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_batch_id uuid not null,
  posted_date date not null,
  description text not null,
  amount numeric(12,2) not null,
  category text,
  recurring_group_key text,
  source text not null default 'csv',
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_user_date_idx on public.transactions(user_id, posted_date desc);
-- Plain (non-partial) unique index -- supabase-js .upsert()/onConflict can
-- target this directly, unlike a partial index. Prevents the same CSV row
-- from being inserted twice (e.g. the user re-uploads the same export).
create unique index if not exists transactions_dedupe_idx
  on public.transactions(user_id, posted_date, description, amount);

alter table public.transactions enable row level security;

create policy transactions_select_own on public.transactions
  for select using (auth.uid() = user_id);
create policy transactions_insert_own on public.transactions
  for insert with check (auth.uid() = user_id);
create policy transactions_delete_own on public.transactions
  for delete using (auth.uid() = user_id);

-- Track provenance on bills/income, and a stable key back to the CSV
-- merchant group that created a row so a later re-import updates it in
-- place (select-then-branch in app/api/transactions/import, mirroring
-- lib/plaid.ts's syncLiabilitiesForItem pattern) instead of duplicating it.
-- Deliberately NOT a unique index -- supabase-js can't target a partial
-- unique index's predicate for ON CONFLICT inference, so the API route does
-- an explicit select-by-key-then-update-or-insert instead.
alter table public.bills
  add column if not exists source text not null default 'manual',
  add column if not exists recurring_group_key text;

alter table public.income
  add column if not exists source text not null default 'manual',
  add column if not exists recurring_group_key text;

create index if not exists bills_recurring_group_key_idx on public.bills(user_id, recurring_group_key);
create index if not exists income_recurring_group_key_idx on public.income(user_id, recurring_group_key);
