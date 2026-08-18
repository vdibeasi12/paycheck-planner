-- Financial Health Score (Debt Analytics page): a live, recalculating score
-- (not the static Money Quiz) that needs a persisted "last time we looked"
-- snapshot so the UI can animate the count-up and explain what changed
-- ("+4 points -- your debt-to-income ratio improved") on the next visit
-- after real progress. All columns are nullable -- a user who has never
-- opened the Debt Analytics page simply has no snapshot yet, and the score
-- is computed fresh (no delta/celebration shown) the first time they do.
alter table public.profiles
  add column if not exists financial_health_score numeric,
  add column if not exists financial_health_score_updated_at timestamptz,
  add column if not exists financial_health_dti numeric,
  add column if not exists financial_health_avg_apr numeric,
  add column if not exists financial_health_progress_pct numeric;
