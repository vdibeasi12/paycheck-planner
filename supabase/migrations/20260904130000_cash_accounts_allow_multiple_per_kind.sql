-- Vince asked again for multiple checking/savings accounts (after an
-- earlier same-day multi-account attempt was ripped out for being
-- overcomplicated with per-account transaction linking). This time it's
-- simple: any number of named accounts per kind, pooled together --
-- all Checking balances summed into one total that gets projected
-- forward for Safe to Spend/Survival Mode, all Savings balances summed
-- and shown as-is. Preserves the existing single checking/savings rows
-- (real data on file) by giving them an id and a default name.

alter table public.cash_accounts add column if not exists id uuid not null default gen_random_uuid();
alter table public.cash_accounts add column if not exists name text not null default '';
alter table public.cash_accounts add column if not exists created_at timestamptz not null default now();

update public.cash_accounts set name = initcap(kind) where name = '';

alter table public.cash_accounts drop constraint if exists cash_accounts_pkey;
alter table public.cash_accounts add primary key (id);

create index if not exists cash_accounts_user_id_idx on public.cash_accounts (user_id);
