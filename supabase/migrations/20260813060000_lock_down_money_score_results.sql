-- Lock down public.money_score_results.
--
-- The original SELECT/UPDATE policies (20260812200000_money_score_results.sql)
-- used `using (true)` with no column restriction. Postgres RLS filters rows,
-- not columns or query shape -- so a request to the PostgREST endpoint with
-- no share_slug filter (e.g. GET /rest/v1/money_score_results?select=email,answers)
-- returned every user's captured email address and raw quiz answers, not just
-- the single row the app intends to expose on a shared result page. The same
-- permissive UPDATE policy let anyone overwrite email (or score/category_scores
-- /answers) on any row, not just one they created.
--
-- Scores and category breakdowns are intentionally public -- that's the
-- "share your score" growth feature -- but email and raw answers never should
-- be. Fix: keep the existing row-level policies (anyone can act on any row is
-- fine here, since there's no user_id to scope by on an anonymous quiz), but
-- restrict which *columns* anon/authenticated can actually see or write via
-- Postgres column-level privileges. A generated `has_email` column lets the
-- result page show "plan sent" state without ever exposing the address itself.

alter table public.money_score_results
  add column if not exists has_email boolean generated always as (email is not null) stored;

revoke select, update on public.money_score_results from anon, authenticated;

grant select (share_slug, score, category_scores, created_at, has_email)
  on public.money_score_results
  to anon, authenticated;

grant update (email, email_captured_at)
  on public.money_score_results
  to anon, authenticated;
