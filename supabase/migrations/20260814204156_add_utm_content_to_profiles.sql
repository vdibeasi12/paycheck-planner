-- Video/ad-level attribution (e.g. utm_content=video_047), alongside the
-- existing utm_source/utm_medium/utm_campaign columns from
-- 20260808003545_add_utm_attribution_to_profiles.sql. Captured and attached
-- the same way -- see app/components/AttributionCapture.tsx and
-- app/auth/callback/route.ts.
alter table public.profiles
  add column if not exists utm_content text;

comment on column public.profiles.utm_content is 'Optional utm_content param (e.g. a specific video/ad id) captured at first visit, attached at signup alongside utm_source/medium/campaign.';
