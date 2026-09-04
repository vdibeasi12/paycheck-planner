-- Sep 4 2026, Vince: traced a live "Still Due Before Payday" figure and found
-- lib/paycheckCycles.ts's itemsDueInWindow never actually read a bill's
-- `frequency` -- billOccurrenceInMonth "always recur[s] monthly today," so a
-- bimonthly bill (e.g. a water bill only actually billed every other month)
-- was silently treated as due in EVERY month instead of every other one.
--
-- There's no anchor date on a bill (just a day-of-month), so there's no way
-- to derive on its own which of the two months a bimonthly bill lands on --
-- that needs one more bit of information from the user. bimonthly_parity
-- records it: 'odd' (Jan, Mar, May, Jul, Sep, Nov) or 'even' (Feb, Apr, Jun,
-- Aug, Oct, Dec). Only meaningful when frequency = 'bimonthly'; null means
-- "not set yet" and itemsDueInWindow deliberately falls back to the old
-- every-month behavior in that case rather than guessing or silently
-- dropping a real bill.
alter table public.bills add column if not exists bimonthly_parity text
  check (bimonthly_parity in ('odd', 'even'));
