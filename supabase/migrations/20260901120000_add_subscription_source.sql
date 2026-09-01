-- Add a `source` column to public.subscriptions so we can tell a web/Stripe
-- subscription apart from a native iOS (RevenueCat/StoreKit) or Android
-- (RevenueCat/Play Billing) one. This is what lets the new RevenueCat
-- webhook (app/api/revenuecat/webhook/route.ts) safely downgrade a plan on
-- expiration/cancellation WITHOUT ever clobbering a user who is grandfathered
-- in on an existing Stripe subscription -- it only ever acts on rows it
-- itself owns (source = 'app_store' / 'play_store').
--
-- Also widens the `tier` check constraint to include 'connected' (the
-- Autopilot tier, see lib/plans.ts) -- the original constraint in
-- SUPABASE_SETUP_COMPLETE.sql only allowed ('free','starter','premium'),
-- which predates the Autopilot tier and would otherwise reject every
-- Autopilot subscription row (Stripe or RevenueCat).

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'stripe'
    CHECK (source IN ('stripe', 'app_store', 'play_store'));

-- RevenueCat's own subscriber/transaction id, for idempotency and support
-- lookups (RevenueCat dashboard search, refund investigation, etc.).
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS revenuecat_original_transaction_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_revenuecat_transaction_id
  ON public.subscriptions(revenuecat_original_transaction_id);

-- Existing rows all came from Stripe (RevenueCat integration didn't exist
-- before this migration) -- the column default already covers this, but be
-- explicit for anyone reading history later.
UPDATE public.subscriptions SET source = 'stripe' WHERE source IS NULL;

-- Widen the tier constraint to match lib/plans.ts's four tiers.
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tier_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_tier_check
    CHECK (tier IN ('free', 'starter', 'premium', 'connected'));

-- One subscription row per (user_id, source): a user can legitimately have
-- both a historical Stripe row and a new RevenueCat row (e.g. grandfathered
-- on web, later also has an app-store trial) without them overwriting each
-- other. The original schema's upsert used onConflict "user_id" alone
-- (single row per user); this migration relaxes that so both webhooks can
-- upsert independently. profiles.plan (not this table) remains the single
-- source of truth for what the app actually gates on.
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;
DROP INDEX IF EXISTS idx_subscriptions_user_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_id_source
  ON public.subscriptions(user_id, source);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);

COMMENT ON COLUMN public.subscriptions.source IS
  'Which payment platform this subscription row came from. Used to prevent the RevenueCat webhook from downgrading a user who is really on a grandfathered Stripe plan, and vice versa.';
