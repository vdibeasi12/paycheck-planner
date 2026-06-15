-- Run once in the Supabase SQL editor.

-- 1) Add an admin flag to profiles (safe to re-run).
alter table profiles
  add column if not exists is_admin boolean not null default false;

-- 2) Make YOUR account an admin AND give it full feature access.
--    Replace the email with the one you log in with.
update profiles
set is_admin = true,
    plan = 'premium'
where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');

-- 3) Verify.
select p.id, u.email, p.is_admin, p.plan
from profiles p
join auth.users u on u.id = p.id
where u.email = 'YOUR_EMAIL_HERE';
