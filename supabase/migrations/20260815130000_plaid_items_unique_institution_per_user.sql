-- QA fix (Aug 15 2026): nothing stopped a user from linking the same bank
-- twice -- app/api/plaid/exchange/route.ts upserts on item_id only, and
-- Plaid hands back a fresh item_id (a separate billable Item) each time
-- Link completes, even for the same institution/login. Verified no
-- existing duplicates for any user before adding this. institution_id
-- can legitimately be null (Plaid didn't resolve it) or the same
-- disconnected-and-relinked bank later -- disconnect already hard-deletes
-- the row (see app/api/plaid/disconnect/route.ts), so there's no stale
-- "inactive" row to exclude here.
create unique index if not exists plaid_items_user_institution_unique
  on public.plaid_items (user_id, institution_id)
  where institution_id is not null;
