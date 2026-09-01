// lib/iap.ts
// Thin wrapper around the RevenueCat Capacitor SDK (@revenuecat/purchases-capacitor),
// which bridges to native StoreKit on iOS. This is the ONLY purchase path that
// should ever run inside the iOS app -- App Store Guideline 3.1.1 requires paid
// digital content unlocked in-app to go through Apple's In-App Purchase system.
//
// Web and Android keep using Stripe Checkout (see app/api/stripe/checkout and
// lib/plans.ts) -- that's unchanged. This file only activates on iOS native.
//
// All calls are dynamic-imported and guarded by isIOSApp() so this never enters
// the web bundle or runs during SSR, matching the existing pattern in
// NativeInit.tsx and lib/platform.ts.
"use client";

import { isIOSApp } from "@/lib/platform";
import { tierFromEntitlementIds, type TierId } from "@/lib/plans";

// Public (client-safe) RevenueCat API key for the iOS app. Get this from
// RevenueCat -> Project -> Apps -> (your iOS app) -> API Keys. It is safe to
// expose in the client bundle (same trust level as a Stripe publishable key).
const REVENUECAT_IOS_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY;

let configured = false;
let configuringPromise: Promise<void> | null = null;

/**
 * Configure the RevenueCat SDK. Safe to call multiple times -- only the
 * first call actually configures the native SDK. No-ops outside the iOS app.
 *
 * appUserId: pass the Supabase auth user id when known so RevenueCat's
 * customer record maps 1:1 to our own user (this is what the RevenueCat
 * webhook keys off of to update `profiles.plan`). Omit to configure
 * anonymously at cold start, then call `loginIAPUser` once auth resolves.
 */
export async function configureIAP(appUserId?: string): Promise<void> {
  if (!isIOSApp()) return;
  if (!REVENUECAT_IOS_API_KEY) {
    console.error(
      "configureIAP: NEXT_PUBLIC_REVENUECAT_IOS_API_KEY is not set -- IAP disabled"
    );
    return;
  }
  if (configured) return;
  if (configuringPromise) return configuringPromise;

  configuringPromise = (async () => {
    const { Purchases, LOG_LEVEL } = await import(
      "@revenuecat/purchases-capacitor"
    );
    if (process.env.NODE_ENV !== "production") {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    }
    await Purchases.configure({
      apiKey: REVENUECAT_IOS_API_KEY,
      appUserID: appUserId,
    });
    configured = true;
  })();

  return configuringPromise;
}

/**
 * Associate the current RevenueCat customer with our Supabase user id.
 * Call this right after Supabase auth resolves (sign-in, or an already-
 * warm session on app launch) so purchases attribute to the right account.
 * No-ops outside the iOS app or before configureIAP() has run.
 */
export async function loginIAPUser(userId: string): Promise<void> {
  if (!isIOSApp() || !configured) return;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  await Purchases.logIn({ appUserID: userId });
}

/** Call on sign-out so the next user on this device doesn't inherit entitlements. */
export async function logoutIAPUser(): Promise<void> {
  if (!isIOSApp() || !configured) return;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  await Purchases.logOut();
}

export type IAPPackage = {
  identifier: string;
  product: { identifier: string; priceString: string; title: string };
  raw: unknown; // the original RevenueCat PurchasesPackage, passed back into purchasePackage()
};

/**
 * Fetch the current default offering's packages (i.e. the priced options to
 * show on the paywall). Returns [] on the web/Android or on any SDK error --
 * callers should treat an empty list as "nothing to sell right now" rather
 * than throwing, since a misconfigured offering shouldn't crash the page.
 */
export async function getIAPPackages(): Promise<IAPPackage[]> {
  if (!isIOSApp()) return [];
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return [];
    return current.availablePackages.map((pkg: any) => ({
      identifier: pkg.identifier,
      product: {
        identifier: pkg.product.identifier,
        priceString: pkg.product.priceString,
        title: pkg.product.title,
      },
      raw: pkg,
    }));
  } catch (err) {
    console.error("getIAPPackages failed:", err);
    return [];
  }
}

export type PurchaseResult =
  | { ok: true; tier: TierId }
  | { ok: false; cancelled: boolean; error?: string };

/**
 * Purchase a package. Resolves once StoreKit's sheet completes. The
 * authoritative plan update happens server-side via the RevenueCat webhook
 * (see app/api/revenuecat/webhook/route.ts) -- this return value is only
 * for optimistic UI (spinner -> "you're in"), not the source of truth.
 */
export async function purchaseIAPPackage(
  pkg: IAPPackage
): Promise<PurchaseResult> {
  if (!isIOSApp()) return { ok: false, cancelled: false, error: "not-ios" };
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: pkg.raw as any,
    });
    const tier = tierFromEntitlements(customerInfo.entitlements.active);
    return { ok: true, tier };
  } catch (err: any) {
    // RevenueCat sets userCancelled on the error when the user dismisses the
    // native sheet -- that's expected/frequent and not a real failure.
    if (err?.userCancelled) {
      return { ok: false, cancelled: true };
    }
    console.error("purchaseIAPPackage failed:", err);
    return { ok: false, cancelled: false, error: err?.message ?? "unknown" };
  }
}

/** Re-sync entitlements after e.g. returning from the App Store subscription-management screen. */
export async function restoreIAPPurchases(): Promise<PurchaseResult> {
  if (!isIOSApp()) return { ok: false, cancelled: false, error: "not-ios" };
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const customerInfo = await Purchases.restorePurchases();
    const tier = tierFromEntitlements(customerInfo.customerInfo.entitlements.active);
    return { ok: true, tier };
  } catch (err: any) {
    console.error("restoreIAPPurchases failed:", err);
    return { ok: false, cancelled: false, error: err?.message ?? "unknown" };
  }
}

/** Open the native "Manage Subscriptions" screen (App Store account settings). */
export async function showManageSubscriptions(): Promise<void> {
  if (!isIOSApp()) return;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  await Purchases.showManageSubscriptions();
}

// Thin adapter from RevenueCat's CustomerInfo.entitlements.active shape
// (an object keyed by entitlement id) to the shared tierFromEntitlementIds()
// in lib/plans.ts, which both this file and the server-side webhook use.
function tierFromEntitlements(
  activeEntitlements: Record<string, unknown>
): TierId {
  return tierFromEntitlementIds(Object.keys(activeEntitlements));
}
