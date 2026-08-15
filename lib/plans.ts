// lib/plans.ts
// Single source of truth for branding, pricing tiers, Stripe price IDs,
// and the feature comparison matrix. Import this anywhere you show plans
// so pricing, checkout, and gating never drift apart.

export const BRAND = {
  product: "Paycheck Planner",
  company: "DiBeasi Global Investments LLC", // DBA: "Paycheck Planner"
  supportEmail: "support@paycheckplanner.ai",
  domain: "paycheckplanner.ai",
} as const;

export type TierId = "free" | "starter" | "premium" | "connected";

export type Tier = {
  id: TierId;
  name: string;
  tagline: string;
  priceMonthly: number; // USD per month
  priceAnnual: number; // USD billed once per year
  highlight?: boolean;
  cta: string;
  stripe: { monthly?: string; annual?: string }; // Stripe price IDs
};

// Flip to true to launch the Autopilot (Plaid bank-sync) tier publicly.
// While false, the tier still exists for checkout/webhook wiring and keeps its
// Stripe price IDs, but it is hidden on the pricing page. Keep this false until
// the Plaid sync is fully built and ready to sell.
export const AUTOPILOT_LIVE = true;

export const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    tagline: "See where every dollar of your paycheck goes.",
    priceMonthly: 0,
    priceAnnual: 0,
    cta: "Start free",
    stripe: {},
  },
  {
    id: "starter",
    name: "Momentum",
    tagline: "Start the momentum -- charts that show your debt shrinking.",
    priceMonthly: 3.99,
    priceAnnual: 39.99, // ~10 months -- two months free
    cta: "Build Momentum",
    stripe: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY,
      annual: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY,
    },
  },
  {
    id: "premium",
    name: "Accelerate",
    tagline: "AI in your corner and the full toolkit, so you pay off faster.",
    priceMonthly: 6.99,
    priceAnnual: 69.99, // ~10 months -- two months free
    highlight: true,
    cta: "Hit Accelerate",
    stripe: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY,
      annual: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY,
    },
  },
  {
    id: "connected",
    name: "Autopilot",
    tagline: "Connect your accounts and your whole plan runs itself.",
    priceMonthly: 12.99,
    priceAnnual: 129.99, // ~2 months free vs paying monthly (10 x 12.99 = 129.90)
    cta: "Get Autopilot",
    stripe: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_CONNECTED_MONTHLY,
      annual: process.env.NEXT_PUBLIC_STRIPE_CONNECTED_YEARLY,
    },
  },
];

// Tiers shown on the public pricing page. Autopilot stays hidden until
// AUTOPILOT_LIVE is true, but it remains in TIERS so checkout and the webhook
// can resolve its price IDs the moment it launches.
export const VISIBLE_TIERS: Tier[] = AUTOPILOT_LIVE
  ? TIERS
  : TIERS.filter((t) => t.id !== "connected");

// A cell is either a capability (boolean -> green check / rose cross)
// or a value (string -> shown as text, e.g. a quantity limit).
export type FeatureCell = boolean | string;

export type FeatureRow = {
  label: string;
  free: FeatureCell;
  starter: FeatureCell;
  premium: FeatureCell;
  connected: FeatureCell;
};

export type FeatureGroup = { group: string; rows: FeatureRow[] };

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    group: "Tracking",
    rows: [
      { label: "Debts tracked", free: "Up to 3", starter: "Up to 10", premium: "Unlimited", connected: "Unlimited" },
      { label: "Bills & paychecks", free: true, starter: true, premium: true, connected: true },
      { label: "Net worth & assets", free: true, starter: true, premium: true, connected: true },
      { label: "Calendar & 30-day upcoming view", free: true, starter: true, premium: true, connected: true },
    ],
  },
  {
    group: "Insights",
    rows: [
      { label: "Charts & visualizations", free: false, starter: true, premium: true, connected: true },
      { label: "Snowball & Avalanche payoff", free: false, starter: false, premium: true, connected: true },
      { label: "Advanced analytics", free: false, starter: false, premium: true, connected: true },
      // Not tier-gated -- every signed-in user gets all 6 courses, with each
      // course unlocking once the one before it is fully complete. Listed
      // here (true across every column) to show it's not a paywalled perk.
      { label: "Paycheck Planner University (6 courses)", free: true, starter: true, premium: true, connected: true },
    ],
  },
  {
    group: "Smart tools",
    rows: [
      { label: "AI insights & support", free: false, starter: false, premium: true, connected: true },
      { label: "Camera bill & paycheck capture", free: false, starter: false, premium: true, connected: true },
      // Was starter-and-up when this lived on a separate Report page; now it's
      // a "Download PDF summary" action on the Payoff Plan page, which is
      // itself Accelerate-and-up (see "Snowball & Avalanche payoff" above).
      { label: "PDF reports & export", free: false, starter: false, premium: true, connected: true },
    ],
  },
  {
    group: "Automation",
    rows: [
      // Renamed from "Bank account sync (Plaid)" (Aug 15) -- don't expose the
      // vendor name in pricing copy; keeps this row accurate no matter which
      // aggregator/product powers it under the hood.
      { label: "Automatic bank account sync", free: false, starter: false, premium: false, connected: true },
      // New: connecting a bank is no longer limited to accounts that carry
      // a loan/credit card balance -- plain checking/savings accounts can
      // connect too, with balances refreshing automatically.
      { label: "Checking & savings balance sync", free: false, starter: false, premium: false, connected: true },
      { label: "Auto-import debts, balances & APRs", free: false, starter: false, premium: false, connected: true },
      { label: "Auto income, bills & safe-to-spend", free: false, starter: false, premium: false, connected: true },
      { label: "Recurring-charge detector", free: false, starter: false, premium: false, connected: true },
      // Bank statement import (Phase 1 CSV, Aug 15; PDF added same day):
      // works today with zero Plaid dependency, so it's available a tier
      // earlier than the Plaid-powered rows above.
      { label: "Import a bank statement (PDF or CSV)", free: false, starter: false, premium: true, connected: true },
    ],
  },
  {
    group: "Support",
    rows: [
      { label: "Email support", free: true, starter: true, premium: true, connected: true },
      { label: "Priority support", free: false, starter: false, premium: true, connected: true },
    ],
  },
];

// Effective monthly cost when billed annually (for "$X/mo billed yearly").
export function effectiveMonthly(annual: number): number {
  return Math.round((annual / 12) * 100) / 100;
}

// Reverse lookup: a Stripe price ID -> the plan tier it belongs to.
// Server- and client-safe: it reads the same NEXT_PUBLIC_ price IDs that
// drive the pricing page, so checkout and the webhook can never disagree
// with what the customer actually saw and paid for. Returns null for
// unknown/foreign price IDs (e.g. stale IDs from an old Stripe account).
export function planForPriceId(
  priceId: string | null | undefined
): TierId | null {
  if (!priceId) return null;
  for (const tier of TIERS) {
    if (priceId === tier.stripe.monthly || priceId === tier.stripe.annual) {
      return tier.id;
    }
  }
  return null;
}