-- Task #23: automated review-prompt engine. Ask for an App Store / Play
-- Store review at most once per account, after a genuine value moment (see
-- lib/reviewPrompt.ts + app/components/ReviewPromptInit.tsx) rather than
-- immediately after install.
alter table public.profiles
  add column if not exists review_prompt_shown_at timestamptz;

comment on column public.profiles.review_prompt_shown_at is 'Set the one time the native in-app review prompt is requested (see app/components/ReviewPromptInit.tsx). Never re-asked once set.';
