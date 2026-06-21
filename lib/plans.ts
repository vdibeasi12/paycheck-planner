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
    priceMonthly: 11.99,
    priceAnnual: 119.99, // ~2 months free vs paying monthly
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
    ],
  },
  {
    group: "Insights",
    rows: [
      { label: "Charts & visualizations", free: false, starter: true, premium: true, connected: true },
      { label: "Snowball & Avalanche payoff", free: false, starter: false, premium: true, connected: true },
      { label: "Advanced analytics", free: false, starter: false, premium: true, connected: true },
    ],
  },
  {
    group: "Smart tools",
    rows: [
      { label: "AI insights & support", free: false, starter: false, premium: true, connected: true },
      { label: "Camera bill & paycheck capture", free: false, starter: false, premium: true, connected: true },
      { label: "PDF reports & export", free: false, starter: true, premium: true, connected: true },
    ],
  },
  {
    group: "Automation",
    rows: [
      { label: "Bank account sync (Plaid)", free: false, starter: false, premium: false, connected: true },
      { label: "Auto-import debts, balances & APRs", free: false, starter: false, premium: false, connected: true },
      { label: "Auto income, bills & safe-to-spend", free: false, starter: false, premium: false, connected: true },
      { label: "Recurring-charge detector", free: false, starter: false, premium: false, connected: true },
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