do $$
declare r record;
begin
  for r in
    select rel.relname as tbl, con.conname as fk
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_class ref on ref.oid = con.confrelid
    join pg_namespace rns on rns.oid = ref.relnamespace
    where con.contype='f' and rns.nspname='public' and ref.relname='users'
  loop
    execute format('alter table public.%I drop constraint %I', r.tbl, r.fk);
    execute format('alter table public.%I add constraint %I foreign key (user_id) references auth.users(id) on delete cascade', r.tbl, r.fk);
  end loop;
end $$;
