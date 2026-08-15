-- QA fix (Aug 15 2026): the payoff engine (lib/payoffSimulate.ts) treats a
-- debt's entire minimum_payment as principal+interest. For a mortgage,
-- minimum_payment very often bundles in escrow (property tax + homeowners
-- insurance) collected by the servicer alongside the real loan payment --
-- money that leaves the user's account every month but never touches the
-- loan balance. Counting it as if it did made a real account's mortgage
-- amortize in ~11 years when 20+ years actually remain. escrow_payment
-- lets a user split that out; NULL/0 (the default) behaves exactly as
-- before for every existing debt.
alter table public.debts
  add column if not exists escrow_payment numeric;

comment on column public.debts.escrow_payment is
  'Portion of minimum_payment that is escrow (property tax/insurance), not principal+interest. Excluded from payoff amortization math in lib/payoffSimulate.ts; minimum_payment itself is unchanged and still reflects the full real-world monthly outflow for budgeting purposes.';
