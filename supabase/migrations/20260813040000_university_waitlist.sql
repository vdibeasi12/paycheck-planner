create table if not exists public.university_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text,
  created_at timestamptz not null default now()
);

alter table public.university_waitlist enable row level security;

create policy "Anyone can join the university waitlist"
  on public.university_waitlist
  for insert
  to anon, authenticated
  with check (true);
