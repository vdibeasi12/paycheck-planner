-- Dedupe flag for the new badge-earned email (app/api/achievements/check).
-- Written as part of the same request that inserts the achievements row,
-- and re-checked before sending -- same "claim before send, roll back on
-- failure" pattern lib/sendWelcomeEmail.ts already uses for the welcome
-- email, so a retry or a race never double-sends.
alter table public.achievements add column if not exists email_sent_at timestamptz;
