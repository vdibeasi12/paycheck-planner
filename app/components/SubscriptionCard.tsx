"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/withTimeout";
import { isNativeApp, useIsNativeApp, useIsIOSApp } from "@/lib/platform";
import { showManageSubscriptions } from "@/lib/iap";
import { CreditCard, Loader2 } from "lucide-react";

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  starter: "Momentum",
  premium: "Accelerate",
  connected: "Autopilot",
};

// userId: pass the already-fetched account id (see app/account/page.tsx) to
// skip this component's own supabase.auth.getUser() call. Falls back to
// fetching it itself when used standalone without the prop.
export default function SubscriptionCard({ userId }: { userId?: string } = {}) {
  const native = useIsNativeApp();
  const ios = useIsIOSApp();
  const [plan, setPlan] = useState<string | null>(null);
  // Which platform the user's active paid subscription came from ('stripe' |
  // 'app_store' | 'play_store' | null). Drives manage(): a grandfathered
  // Stripe subscriber using the iOS app still needs the Stripe portal, not
  // Apple's native subscription-management screen, since there's nothing
  // there for a subscription Apple never sold.
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadPlan = useCallback(async () => {
    try {
      let id = userId;
      if (!id) {
        const { data } = await withTimeout(supabase.auth.getUser(), 8000, {
          data: { user: null },
        } as Awaited<ReturnType<typeof supabase.auth.getUser>>);
        id = data.user?.id;
      }
      if (!id) {
        setLoading(false);
        return;
      }
      const [{ data: profileData }, { data: subRows }] = await Promise.all([
        withTimeout(
          supabase.from("profiles").select("plan").eq("id", id).single(),
          8000,
          { data: null } as any
        ),
        withTimeout(
          supabase
            .from("subscriptions")
            .select("source")
            .eq("user_id", id)
            .eq("status", "active")
            .neq("tier", "free"),
          8000,
          { data: [] } as any
        ),
      ]);
      setPlan((profileData?.plan as string) ?? "free");
      // Prefer an app-store-sourced row if one exists (matches what "Manage
      // subscription" should actually open on iOS); otherwise fall back to
      // whatever active row is there (typically 'stripe').
      const rows = (subRows as { source: string }[]) ?? [];
      const preferred =
        rows.find((r) => r.source === "app_store" || r.source === "play_store") ??
        rows[0];
      setSource(preferred?.source ?? null);
    } catch {
      // A hiccup fetching the plan shouldn't leave this card spinning
      // forever -- fall back to "Free" so the rest of the card (and page)
      // still renders; the user can retry by revisiting the page.
      setPlan("free");
      setSource(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    if (!isNativeApp()) return;
    let removeListener: (() => void) | undefined;
    let cancelled = false;
    ;(async () => {
      // On Android, "Manage subscription" / "Upgrade plan" below open the
      // Stripe portal/checkout in an in-app browser overlay (see manage()
      // and the pricing page) instead of leaving the app. Whenever that
      // overlay closes, re-check the plan -- the user may have just
      // upgraded, downgraded, or cancelled, and this card would otherwise
      // keep showing whatever it last loaded until the page is revisited.
      const { Browser } = await import("@capacitor/browser")
      const handle = await Browser.addListener("browserFinished", () => {
        loadPlan()
      })
      if (cancelled) {
        handle.remove()
      } else {
        removeListener = () => handle.remove()
      }
    })()
    return () => {
      cancelled = true
      removeListener?.()
    }
  }, [loadPlan]);

  async function manage() {
    setBusy(true);
    try {
      // iOS subscriptions bought through RevenueCat/StoreKit have no Stripe
      // customer to open a portal for -- send the user to Apple's native
      // "Manage Subscriptions" screen instead. A grandfathered iOS user
      // whose active plan is really a Stripe subscription (source !==
      // 'app_store') falls through to the Stripe portal below instead,
      // same as web/Android -- Apple's screen would show nothing for a
      // subscription Apple never sold.
      if (ios && source === "app_store") {
        await showManageSubscriptions();
        return;
      }

      const res = await fetch("/api/billing", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.url) {
        // Most common cause: the plan was set directly (e.g. an admin or
        // reviewer account) rather than through an actual Stripe checkout,
        // so there's no stripe_customer_id to open a portal session for.
        // Rather than dead-end on an error, send them somewhere they can
        // actually act -- the pricing page lets them pick/change a plan.
        // This is an internal route (same origin as the app itself), so a
        // normal in-webview navigation is fine here even natively -- only
        // the external billing.stripe.com URL below needs Browser.open().
        window.location.href = "/pricing";
        return;
      }
      if (isNativeApp()) {
        // Android only reaches here (iOS already handled above). Open in an
        // in-app browser overlay instead of navigating the app's own
        // webview to billing.stripe.com, which would drop the Capacitor
        // bridge. Same pattern as Google sign-in (NativeInit.tsx).
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: body.url });
      } else {
        window.location.href = body.url;
      }
    } catch {
      window.location.href = "/pricing";
    } finally {
      setBusy(false);
    }
  }

  const isPaid = plan !== null && plan !== "free";
  const planName = plan ? PLAN_NAMES[plan] ?? plan : "Free";
  // Every platform gets real, functional buttons now -- manage() and the
  // "Upgrade plan" link both branch internally on iOS vs. web/Android to
  // route to the right purchase/management surface (RevenueCat/StoreKit vs.
  // Stripe). There's no more iOS-only informational dead-end.
  const showLiveControls = native !== null && ios !== null;

  return (
    <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <CreditCard size={20} className="text-emerald-500" />
        <h2 className="text-lg font-semibold text-white">Subscription</h2>
      </div>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" /> Loading...
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-gray-300">
            Current plan:{" "}
            <span className="font-semibold text-white">{planName}</span>
          </p>

          {showLiveControls ? (
            isPaid ? (
              <>
                <button
                  type="button"
                  onClick={manage}
                  disabled={busy}
                  className="mt-4 flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-600 disabled:opacity-60"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                  Manage subscription
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  {ios && source === "app_store"
                    ? "Opens the App Store's subscription management."
                    : `Opens the secure Stripe portal to change plan, update payment, or cancel${
                        native === true ? " (opens in-app)" : ""
                      }.`}
                </p>
              </>
            ) : (
              <Link
                href="/pricing"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-black hover:bg-green-600"
              >
                Upgrade plan
              </Link>
            )
          ) : null}
        </>
      )}
    </div>
  );
}
