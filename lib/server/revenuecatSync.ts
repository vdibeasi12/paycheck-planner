// lib/server/revenuecatSync.ts
// Server-only. Shared by:
//  - app/api/revenuecat/webhook/route.ts (async, RevenueCat-initiated)
//  - app/api/revenuecat/confirm/route.ts (sync, called by the client right
//    after a purchase completes, so the UI doesn't have to wait on webhook
//    delivery latency to reflect the new plan)
//
// Grandfathering rule (see supabase/migrations/20260901120000_add_subscription_source.sql):
// this only ever reads/writes subscriptions rows with source IN
// ('app_store', 'play_store'). It never touches a user's Stripe-sourced row,
// and only downgrades profiles.plan to free when NO other source (Stripe
// included) is currently active for that user.
import { createClient } from "@supabase/supabase-js";
import { tierFromEntitlementIds, type TierId } from "@/lib/plans";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type AppStoreSource = "app_store" | "play_store";

export async function fetchActiveEntitlementIds(
  appUserId: string
): Promise<string[]> {
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.REVENUECAT_SECRET_API_KEY}`,
      },
    }
  );
  if (!res.ok) {
    throw new Error(`RevenueCat subscriber lookup failed: ${res.status}`);
  }
  const body = await res.json();
  const active = body?.subscriber?.entitlements ?? {};
  const now = Date.now();
  return Object.entries(active)
    .filter(([, e]: [string, any]) => {
      if (!e?.expires_date_ms) return true; // lifetime/non-expiring entitlement
      return e.expires_date_ms > now;
    })
    .map(([id]) => id);
}

async function upsertProfilePlan(
  userId: string,
  tier: TierId,
  status: "active" | "canceled"
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ plan: tier, subscription_status: status })
    .eq("id", userId)
    .select("id");
  if (error) {
    console.error("revenuecatSync: profiles update failed:", error.message);
    return;
  }
  if (!data || data.length === 0) {
    console.error("revenuecatSync: no profile matched user id", userId);
  }
}

/**
 * Re-check what's actually active for this user on RevenueCat right now,
 * mirror it into their own (user_id, source) subscriptions row, and update
 * profiles.plan -- upgrading unconditionally, but only downgrading to free
 * when every other known source (Stripe included) is also inactive.
 *
 * Returns the tier that ended up gating this user's access.
 */
export async function syncRevenueCatEntitlementsForUser(
  userId: string,
  source: AppStoreSource,
  expirationAtMs?: number | null,
  originalTransactionId?: string | null
): Promise<TierId> {
  const activeEntitlementIds = await fetchActiveEntitlementIds(userId);
  const tierFromThisSource = tierFromEntitlementIds(activeEntitlementIds);

  const { error: subError } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      source,
      tier: tierFromThisSource,
      status: tierFromThisSource === "free" ? "canceled" : "active",
      current_period_end: expirationAtMs
        ? new Date(expirationAtMs).toISOString()
        : null,
      revenuecat_original_transaction_id: originalTransactionId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,source" }
  );
  if (subError) {
    console.error("revenuecatSync: subscriptions upsert failed:", subError.message);
  }

  if (tierFromThisSource !== "free") {
    await upsertProfilePlan(userId, tierFromThisSource, "active");
    return tierFromThisSource;
  }

  // This source's entitlement is inactive/lapsed -- only drop to free if no
  // OTHER source (Stripe grandfathering, or the other app store) is active.
  const { data: otherActiveRows } = await supabase
    .from("subscriptions")
    .select("tier, status, source")
    .eq("user_id", userId)
    .neq("source", source)
    .eq("status", "active");

  const stillActive = (otherActiveRows ?? []).find((r) => r.tier !== "free");
  const resolvedTier = (stillActive?.tier as TierId) ?? "free";
  await upsertProfilePlan(userId, resolvedTier, stillActive ? "active" : "canceled");
  return resolvedTier;
}
