-- Powers the "On a Roll" (7-day) / "Streak Master" (30-day) achievements,
-- which were shipped as permanently "coming soon" placeholders with no
-- underlying data to ever earn them. last_active_date is a plain date (not
-- last_active_at's timestamp) so "bump once per calendar day" is a simple
-- equality/yesterday check rather than a time-window calculation.
alter table public.profiles add column if not exists current_streak integer not null default 0;
alter table public.profiles add column if not exists longest_streak integer not null default 0;
alter table public.profiles add column if not exists last_active_date date;
