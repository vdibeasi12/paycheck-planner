-- Link a savings goal to one imported-transaction account so its progress
-- can be calculated automatically from real transaction history, with no
-- Plaid Auth / live bank balance required (Plaid Auth was denied for
-- Production -- see lib/csvImport.ts's header comment). See
-- /areas/paycheck-planner.md and lib/goalAutoCalc.ts.
--
-- account_label tags which real-world account an imported transaction came
-- from (e.g. "Checking", "Savings") -- previously every CSV/PDF import was
-- lumped together with no way to tell accounts apart. Existing rows predate
-- this column and were all imported for bill/income detection off a
-- checking-style export, so they backfill to 'Checking' rather than being
-- left unlabeled and permanently unusable for linking.
alter table public.transactions
  add column if not exists account_label text;

update public.transactions
  set account_label = 'Checking'
  where account_label is null;

alter table public.transactions
  alter column account_label set default 'Checking';

create index if not exists transactions_account_label_idx
  on public.transactions(user_id, account_label);

-- A goal linked to an account has its current_amount computed as
-- starting_balance (whatever was already in that account before the
-- earliest imported transaction, entered once by the user) plus the net of
-- every transaction imported under that account label. Unlinked goals keep
-- today's fully-manual "Add a contribution" behavior.
alter table public.financial_goals
  add column if not exists linked_account_label text,
  add column if not exists starting_balance numeric(12,2) not null default 0;
