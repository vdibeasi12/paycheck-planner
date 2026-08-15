-- QA fix (Aug 15 2026): income rows that are internal account transfers (not
-- real income) were being summed into total income everywhere -- this is
-- what inflated one user's dashboard/safe-to-spend numbers. Going forward,
-- lib/csvImport.ts detects and excludes transfers from CSV-driven recurring
-- suggestions, and the manual Add Income form lets users tag one directly.
-- This backfills any transfer-like rows that were already imported before
-- that detection existed.
update public.income
set income_type = 'transfer'
where income_type is distinct from 'transfer'
  and (
    name ilike '%transfer from%' or
    name ilike '%transfer to%' or
    name ilike '%internal transfer%' or
    name ilike '%xfer%'
  );
