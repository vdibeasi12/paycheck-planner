-- Sep 4 2026, Vince: "have the credit cards and debt use transaction which
-- will minus the amount in checking and savings, also add when a paycheck
-- will be sent on the due date, so those checking plus savings should auto
-- adjust."
--
-- Every account's own balance up to now has just been a number the user
-- typed in, frozen until they edit it again or use "Mark as paid." To
-- auto-adjust a SPECIFIC account correctly, the app has to know which
-- account each bill/debt is actually paid from, and which account each
-- paycheck actually deposits into -- there's no way to derive that on its
-- own. cash_account_id records it, set per-row in Bills & Debts / Income;
-- left null it changes nothing (still counts toward the pooled Safe-to-
-- Spend total, same as always), it just won't move any one account's own
-- auto-adjusted number until it's linked. See lib/cashBalance.ts's
-- projectAccountBalance, the only place this is read.
alter table public.bills add column if not exists cash_account_id uuid references public.cash_accounts(id) on delete set null;
alter table public.debts add column if not exists cash_account_id uuid references public.cash_accounts(id) on delete set null;
alter table public.income add column if not exists cash_account_id uuid references public.cash_accounts(id) on delete set null;

create index if not exists bills_cash_account_id_idx on public.bills(cash_account_id);
create index if not exists debts_cash_account_id_idx on public.debts(cash_account_id);
create index if not exists income_cash_account_id_idx on public.income(cash_account_id);
