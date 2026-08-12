create table if not exists public.money_score_results (
  id uuid primary key default gen_random_uuid(),
  share_slug text unique not null,
  score int not null check (score >= 0 and score <= 100),
  category_scores jsonb not null,
  answers jsonb not null,
  email text,
  email_captured_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists money_score_results_share_slug_idx
  on public.money_score_results (share_slug);

alter table public.money_score_results enable row level security;

create policy "Anyone can create a money score result"
  on public.money_score_results
  for insert
  to anon, authenticated
  with check (true);

create policy "Anyone can view a money score result by slug"
  on public.money_score_results
  for select
  to anon, authenticated
  using (true);

create policy "Anyone can add their email to a money score result"
  on public.money_score_results
  for update
  to anon, authenticated
  using (true)
  with check (true);