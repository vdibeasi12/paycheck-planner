-- Needed for the badge-earned email's "claim before send" pattern
-- (app/api/achievements/check/route.ts): it sets email_sent_at on its own
-- achievements row right before sending, and rolls it back to null if the
-- send fails. The table only had select/insert policies before this --
-- every such update silently affected 0 rows under RLS, so the dedupe
-- flag could never actually be set and every check() call would attempt to
-- resend the email for the same already-earned badges.
create policy ach_update_own on public.achievements
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
