// lib/plans.ts
// Single source of truth for branding, pricing tiers, Stripe price IDs,
// and the feature comparison matrix. Import this anywhere you show plans
// so pricing, checkout, and gating never drift apart.

export const BRAND = {
  product: "Paycheck Planner",
  company: "DiBeasi Global Investment LLC", // confirm exact legal spelling
  supportEmail: "support@paycheckplanner.ai",
  domain: "paycheckplanner.ai",
} as const;

export type TierId = "free" | "starter" | "premium";

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
    name: "Starter",
    tagline: "Charts and reports to watch your debt shrink.",
    priceMonthly: 3,
    priceAnnual: 33, // 11 months — one month free
    cta: "Choose Starter",
    stripe: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY,
      annual: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY,
    },
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "AI guidance, camera capture, and the full toolkit.",
    priceMonthly: 6,
    priceAnnual: 66, // 11 months — one month free
    highlight: true,
    cta: "Go Premium",
    stripe: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY,
      annual: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY,
    },
  },
];

// A cell is either a capability (boolean -> green check / rose cross)
// or a value (string -> shown as text, e.g. a quantity limit).
export type FeatureCell = boolean | string;

export type FeatureRow = {
  label: string;
  free: FeatureCell;
  starter: FeatureCell;
  premium: FeatureCell;
};

export type FeatureGroup = { group: string; rows: FeatureRow[] };

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    group: "Tracking",
    rows: [
      { label: "Debts tracked", free: "Up to 3", starter: "Up to 10", premium: "Unlimited" },
      { label: "Bills & paychecks", free: true, starter: true, premium: true },
      { label: "Net worth & assets", free: true, starter: true, premium: true },
    ],
  },
  {
    group: "Insights",
    rows: [
      { label: "Charts & visualizations", free: false, starter: true, premium: true },
      { label: "Snowball & Avalanche payoff", free: false, starter: false, premium: true },
      { label: "Advanced analytics", free: false, starter: false, premium: true },
    ],
  },
  {
    group: "Smart tools",
    rows: [
      { label: "AI insights & support", free: false, starter: false, premium: true },
      { label: "Camera bill & paycheck capture", free: false, starter: false, premium: true },
      { label: "PDF reports & export", free: false, starter: true, premium: true },
    ],
  },
  {
    group: "Support",
    rows: [
      { label: "Email support", free: true, starter: true, premium: true },
      { label: "Priority support", free: false, starter: false, premium: true },
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
