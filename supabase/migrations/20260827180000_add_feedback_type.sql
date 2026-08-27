-- Adds a "type" column to feedback so a submission can be categorized as
-- general feedback vs. a feature request, instead of both being lumped
-- together. Lets the admin feedback view (AdminFeedback.tsx) filter down to
-- just what people are actually asking to be built (Vince, Aug 27 2026).
--
-- NOT NULL with a DEFAULT backfills every existing row to 'feedback' as
-- part of this same statement -- there's nothing to categorize retroactively
-- for older submissions, and they were all general feedback (the
-- feature-request option didn't exist yet), so that's the correct default.
alter table public.feedback
  add column if not exists type text not null default 'feedback';

alter table public.feedback
  drop constraint if exists feedback_type_check;

alter table public.feedback
  add constraint feedback_type_check check (type in ('feedback', 'feature_request'));
