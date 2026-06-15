"use client";

import { isNativeApp } from "@/lib/platform";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Sparkles } from "lucide-react";
import {
  BRAND,
  TIERS,
  FEATURE_GROUPS,
  effectiveMonthly,
  type Tier,
  type TierId,
  type FeatureCell,
} from "@/lib/plans";
import { PaycheckPlannerLogo } from "@/components/PaycheckPlannerLogo";

type Billing = "monthly" | "annual";

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("annual");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleCheckout(tier: Tier) {
    // Free tier just sends people into the product.
    if (tier.id === "free") {
      window.location.href = "/signup";
      return;
    }

    // No in-app purchases in the native app (App Store Guideline 3.1.1).
    if (isNativeApp()) {
      window.location.href = "/signup";
      return;
    }

    const priceId = billing === "annual" ? tier.stripe.annual : tier.stripe.monthly;

    // No Stripe price configured yet -> fall back to signup so the button
    // is never a dead end.
    if (!priceId) {
      window.location.href = "/signup";
      return;
    }

    try {
      setLoadingId(tier.id);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json().catch(() => null);
      // If checkout returns a Stripe URL, go there; otherwise route to signup
      // (e.g. user isn't logged in yet).
      window.location.href = data?.url ?? "/signup";
    } catch {
      window.location.href = "/signup";
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <main
      className="min-h-screen text-slate-100"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%, #16243f 0%, #0a1228 55%, #070d1c 100%)",
      }}
    >
      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" aria-label={`${BRAND.product} home`}>
          <PaycheckPlannerLogo />
        </Link>
        <Link
          href="/login"
          className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
        >
          Sign in
        </Link>
      </header>

      <div className="mx-auto max-w-6xl px-6 pb-24">
        {/* Hero */}
        <section className="pt-10 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
            Pricing
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Pick the plan that pays you back
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
            Start free. Upgrade when you want charts, payoff strategies, and AI in
            your corner. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3">
            <BillingToggle billing={billing} onChange={setBilling} />
          </div>
          <p className="mt-3 h-5 text-sm text-emerald-400">
            {billing === "annual" ? "You're saving a month on every paid plan." : "\u00A0"}
          </p>
        </section>

        {/* Tier cards */}
        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              billing={billing}
              loading={loadingId === tier.id}
              onSelect={() => handleCheckout(tier)}
            />
          ))}
        </section>

        {/* Comparison matrix */}
        <section className="mt-20">
          <h2 className="text-center text-2xl font-bold tracking-tight">
            Compare every feature
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Everything in each plan, side by side.
          </p>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="sticky left-0 bg-slate-900/80 px-5 py-4 text-sm font-semibold text-slate-300 backdrop-blur">
                    Feature
                  </th>
                  {TIERS.map((t) => (
                    <th
                      key={t.id}
                      className="px-5 py-4 text-center text-sm font-semibold"
                    >
                      <span className={t.highlight ? "text-emerald-400" : "text-slate-200"}>
                        {t.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_GROUPS.map((group) => (
                  <GroupRows key={group.group} group={group.group} rows={group.rows} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-20 max-w-2xl">
          <h2 className="text-center text-2xl font-bold tracking-tight">Common questions</h2>
          <div className="mt-8 space-y-5">
            <Faq q="Can I switch plans later?">
              Yes — upgrade or downgrade anytime. Changes take effect immediately and
              we prorate the difference.
            </Faq>
            <Faq q="What does the annual plan save me?">
              Annual billing is eleven months for the price of twelve — one month free
              on Starter and Premium.
            </Faq>
            <Faq q="Do I need a card for the Free plan?">
              No. The Free plan stays free, no card required.
            </Faq>
            <Faq q="How do I get help?">
              Email us anytime at {BRAND.supportEmail}. Premium members get priority
              replies.
            </Faq>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <PaycheckPlannerLogo size={26} />
          <p className="text-sm text-slate-500">
            A product of {BRAND.company} ·{" "}
            <a
              href={`mailto:${BRAND.supportEmail}`}
              className="text-slate-400 underline-offset-4 hover:text-emerald-400 hover:underline"
            >
              {BRAND.supportEmail}
            </a>
          </p>
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} {BRAND.company}
          </p>
        </div>
      </footer>
    </main>
  );
}

/* ---------------- components ---------------- */

function BillingToggle({
  billing,
  onChange,
}: {
  billing: Billing;
  onChange: (b: Billing) => void;
}) {
  return (
    <div className="relative inline-flex rounded-full border border-slate-700 bg-slate-900/70 p-1">
      <span
        className="absolute inset-y-1 w-1/2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-transform duration-300"
        style={{ transform: billing === "annual" ? "translateX(100%)" : "translateX(0)" }}
        aria-hidden="true"
      />
      {(["monthly", "annual"] as Billing[]).map((b) => (
        <button
          key={b}
          type="button"
          onClick={() => onChange(b)}
          className={`relative z-10 w-28 rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
            billing === b ? "text-slate-950" : "text-slate-300 hover:text-white"
          }`}
        >
          {b === "annual" ? "Annual" : "Monthly"}
        </button>
      ))}
    </div>
  );
}

function TierCard({
  tier,
  billing,
  loading,
  onSelect,
}: {
  tier: Tier;
  billing: Billing;
  loading: boolean;
  onSelect: () => void;
}) {
  const isFree = tier.id === "free";
  const annual = billing === "annual";
  const headlinePrice = isFree
    ? 0
    : annual
    ? effectiveMonthly(tier.priceAnnual)
    : tier.priceMonthly;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 ${
        tier.highlight
          ? "border-emerald-400/60 bg-emerald-400/[0.06] shadow-[0_0_40px_-12px_rgba(52,211,153,0.5)]"
          : "border-slate-800 bg-slate-900/50"
      }`}
    >
      {tier.highlight && (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-3 py-1 text-xs font-bold text-slate-950">
          <Sparkles size={12} /> Most popular
        </span>
      )}

      <h3 className="text-lg font-semibold">{tier.name}</h3>
      <p className="mt-1 min-h-[40px] text-sm text-slate-400">{tier.tagline}</p>

      <div className="mt-5">
        <div className="flex items-end gap-1">
          <span className="text-4xl font-bold tracking-tight tabular-nums">
            ${isFree ? "0" : headlinePrice.toFixed(2).replace(/\.00$/, "")}
          </span>
          {!isFree && <span className="pb-1 text-sm text-slate-400">/mo</span>}
        </div>
        <p className="mt-1 h-5 text-xs text-slate-500">
          {isFree
            ? "Free forever"
            : annual
            ? `$${tier.priceAnnual} billed yearly · 1 month free`
            : "Billed monthly"}
        </p>
      </div>

      <button
        type="button"
        onClick={onSelect}
        disabled={loading}
        className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
          tier.highlight
            ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 hover:brightness-110"
            : isFree
            ? "border border-slate-700 text-slate-100 hover:bg-slate-800"
            : "bg-slate-100 text-slate-950 hover:bg-white"
        }`}
      >
        {loading ? "Redirecting…" : tier.cta}
      </button>
    </div>
  );
}

function GroupRows({ group, rows }: { group: string; rows: typeof FEATURE_GROUPS[number]["rows"] }) {
  return (
    <>
      <tr>
        <td
          colSpan={4}
          className="bg-slate-900/60 px-5 pt-5 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          {group}
        </td>
      </tr>
      {rows.map((row, i) => (
        <tr key={row.label} className={i % 2 ? "bg-slate-900/20" : ""}>
          <td className="sticky left-0 bg-inherit px-5 py-3 text-sm text-slate-300">
            {row.label}
          </td>
          <Cell value={row.free} />
          <Cell value={row.starter} />
          <Cell value={row.premium} highlight />
        </tr>
      ))}
    </>
  );
}

function Cell({ value, highlight = false }: { value: FeatureCell; highlight?: boolean }) {
  return (
    <td className={`px-5 py-3 text-center ${highlight ? "bg-emerald-400/[0.04]" : ""}`}>
      {typeof value === "string" ? (
        <span className="text-sm font-medium text-slate-200">{value}</span>
      ) : value ? (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <Check size={15} strokeWidth={3} aria-label="Included" />
        </span>
      ) : (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
          <X size={15} strokeWidth={3} aria-label="Not included" />
        </span>
      )}
    </td>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <h3 className="text-sm font-semibold text-slate-100">{q}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{children}</p>
    </div>
  );
}
