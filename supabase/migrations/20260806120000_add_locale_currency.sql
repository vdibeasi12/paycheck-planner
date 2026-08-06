-- Adds per-user language and display-currency preferences.
-- display_currency changes formatting only (symbol/decimal rules) — it does
-- NOT convert stored dollar amounts. That's a separate, larger feature.
alter table public.profiles
  add column if not exists locale text not null default 'en-US',
  add column if not exists display_currency text not null default 'USD';

comment on column public.profiles.locale is
  'UI language + regional formatting, e.g. en-US, es-MX, fr-FR';
comment on column public.profiles.display_currency is
  'Display-only currency code (ISO 4217), e.g. USD, EUR, MXN. No FX conversion applied.';
