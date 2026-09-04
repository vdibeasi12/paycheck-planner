-- Sep 4 2026, Vince: "since I spent the mortgage payment 53rd should adjust
-- to minus that number and not say static... as bills gets paid the
-- accounts should adjust to show whats left. This is a work around because
-- we [don't] have Auth from Plaid."
--
-- There's no live bank balance feed in this app (Plaid here is
-- Liabilities-only), so the only way it finds out a bill/debt actually got
-- paid is if the user says so. paid_through records the nominal due date
-- (day-of-month resolved to a real date) of the most recently confirmed
-- occurrence -- set by the new "Mark as paid" action in Bills & Debts,
-- which also debits the chosen cash account immediately instead of leaving
-- its balance frozen until the next manual edit. Checked against the
-- NOMINAL due date, not any grace-adjusted one, in
-- lib/paycheckCycles.ts's itemsDueInWindow -- paying early inside a grace
-- window still settles that cycle, and this is what stops that early
-- payment from being subtracted a second time once the due date itself
-- rolls around.
alter table public.bills add column if not exists paid_through date;
alter table public.debts add column if not exists paid_through date;
