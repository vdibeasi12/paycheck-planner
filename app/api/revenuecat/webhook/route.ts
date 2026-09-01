// app/api/revenuecat/webhook/route.ts
//
// Receives RevenueCat webhook events for the iOS (and, if enabled later,
// Android) in-app purchase flow and mirrors them into Supabase the same way
// app/api/webhook/route.ts does for Stripe. See lib/iap.ts for the client
// side, lib/plans.ts for the shared entitlement -> tier mapping, and
// lib/server/revenuecatSync.ts for the reconciliation logic this and
// app/api/revenuecat/confirm/route.ts both share.
//
// IMPORTANT -- grandfathering existing Stripe subscribers: see the grandfathering
// note at the top of lib/server/revenuecatSync.ts. This webhook never
// downgrades a user who has an active subscription from another source.
import { NextResponse } from "next/server";
import { syncRevenueCatEntitlementsForUser } from "@/lib/server/revenuecatSync";

// Set this to the exact same string you configure in RevenueCat -> Project
// Settings -> Integrations -> Webhooks -> "Authorization header value".
// RevenueCat sends it back verbatim on every request; treat a mismatch as
// unauthenticated. This is the only auth RevenueCat webhooks support (no
// request signing), so keep it as secret as an API key.
const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

type RevenueCatStore =
  | "APP_STORE"
  | "PLAY_STORE"
  | "STRIPE"
  | "MAC_APP_STORE"
  | "AMAZON"
  | "PROMOTIONAL";

type RevenueCatEvent = {
  type: string;
  app_user_id: string;
  store?: RevenueCatStore;
  expiration_at_ms?: number | null;
  original_transaction_id?: string;
};

function sourceFromStore(store: RevenueCatStore | undefined): "app_store" | "play_store" {
  return store === "PLAY_STORE" ? "play_store" : "app_store";
}

// Events that mean "this customer's entitlements may have changed, ask
// RevenueCat what's active right now and reconcile" rather than hand-parsing
// every event type's own (sometimes stale-by-the-time-it-arrives) fields.
// This is RevenueCat's own recommended pattern -- webhooks tell you
// something happened, GET /subscribers is the source of truth for what's
// active *right now* (handles out-of-order delivery and retries safely).
const RECONCILE_EVENT_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "CANCELLATION",
  "EXPIRATION",
  "BILLING_ISSUE",
  "SUBSCRIPTION_PAUSED",
]);

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!WEBHOOK_SECRET || authHeader !== WEBHOOK_SECRET) {
    console.error("revenuecat webhook: missing/invalid Authorization header");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { event: RevenueCatEvent };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload?.event;
  if (!event?.type || !event?.app_user_id) {
    return NextResponse.json({ error: "Malformed event" }, { status: 400 });
  }

  if (!RECONCILE_EVENT_TYPES.has(event.type)) {
    // TRANSFER, INVOICE_ISSUANCE, TEST, etc. -- nothing for us to reconcile.
    return NextResponse.json({ received: true });
  }

  // app_user_id is the Supabase user id -- lib/iap.ts's configureIAP()/
  // loginIAPUser() always set RevenueCat's appUserID to it. If a purchase
  // ever races ahead of login and this fires with a RevenueCat-generated
  // anonymous id instead, there's no matching profile -- syncRevenueCatEntitlementsForUser
  // logs that and no-ops rather than guessing which account it belongs to.
  try {
    await syncRevenueCatEntitlementsForUser(
      event.app_user_id,
      sourceFromStore(event.store),
      event.expiration_at_ms,
      event.original_transaction_id
    );
  } catch (err) {
    console.error("revenuecat webhook: handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
