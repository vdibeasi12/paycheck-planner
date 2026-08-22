-- Attribution columns for the Money Quiz growth funnel.
--
-- The site already captures first-touch attribution into the pp_attr
-- cookie (see app/components/AttributionCapture.tsx) and logs a page_view
-- event with source/medium/campaign for every navigation, including a
-- visit to /money-score. That tells you the quiz PAGE was viewed from a
-- given channel, but doesn't tell you which channel a completed quiz (or
-- an unlocked/emailed plan -- the real conversion event) came from,
-- without stitching visitorId across the events table by hand.
--
-- Storing source/medium/campaign directly on the money_score_results row
-- at submit time makes "which channel actually finishes the quiz" and
-- "which channel actually converts to an email capture" a plain SQL query
-- against this table, no joins required. visitor_id is stored too so it
-- can still be joined back to the events table (e.g. to see the rest of
-- that visitor's session) when that's useful.
--
-- These columns are never selected by anon/authenticated (see the
-- column-level grants in 20260813060000_lock_down_money_score_results.sql,
-- which this migration deliberately does not touch) -- only the service
-- role (admin reporting) can read them.

alter table public.money_score_results
  add column if not exists source text,
  add column if not exists medium text,
  add column if not exists campaign text,
  add column if not exists visitor_id text;

create index if not exists money_score_results_source_idx
  on public.money_score_results (source);
