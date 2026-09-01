// app/api/revenuecat/confirm/route.ts
//
// Called by the client (see lib/iap.ts's purchaseIAPPackage callers)
// immediately after a StoreKit purchase sheet completes, so the UI reflects
// the new plan right away instead of waiting on RevenueCat webhook delivery
// latency (usually seconds, but not guaranteed). The webhook
// (app/api/revenuecat/webhook/route.ts) remains the durable source of truth
// and will reconcile again independently -- this is purely a fast path.
//
// Deliberately does NOT trust anything the client says about which tier it
// purchased: it re-derives the authenticated user id from the Supabase
// session (never the request body) and asks RevenueCat's own API what's
// actually active for that user, via the same helper the webhook uses.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncRevenueCatEntitlementsForUser } from "@/lib/server/revenuecatSync";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // "app_store" here, not derived from a client-supplied value -- this
    // endpoint only ever exists in the iOS purchase flow (see lib/iap.ts /
    // isIOSApp()). If Android IAP is added later, give it its own route
    // rather than trusting a client-supplied store name.
    const tier = await syncRevenueCatEntitlementsForUser(user.id, "app_store");
    return NextResponse.json({ tier });
  } catch (err) {
    console.error("revenuecat confirm: sync failed:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
