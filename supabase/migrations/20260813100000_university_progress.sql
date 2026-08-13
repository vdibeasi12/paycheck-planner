-- University lesson completion tracking. Same shape as achievements /
-- onboarding_progress: a composite-key table keyed by (user_id, lesson_key),
-- owner-scoped RLS, no service-role involvement needed since every read/
-- write is scoped to auth.uid() through the normal anon/authenticated
-- Supabase client.
--
-- lesson_key is "<courseSlug>.<lessonSlug>", validated against the
-- lib/university.ts catalog by the API route before insert (not enforced
-- in the DB -- the catalog is expected to grow, so this stays a free-form
-- text key rather than a foreign key into a courses table).

create table if not exists public.university_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_key text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_key)
);

alter table public.university_progress enable row level security;

create policy up_select_own on public.university_progress
  for select using (auth.uid() = user_id);

create policy up_insert_own on public.university_progress
  for insert with check (auth.uid() = user_id);

create policy up_delete_own on public.university_progress
  for delete using (auth.uid() = user_id);
