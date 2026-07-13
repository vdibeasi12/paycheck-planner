"use client";

import { isNativeApp } from "@/lib/platform";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Sparkles } from "lucide-react";
import {
  BRAND,
  VISIBLE_TIERS,
  FEATURE_GROUPS,
  type Tier,
  type TierId,
  type FeatureCell,
} from "@/lib/plans";
import { PaycheckPlannerLogo } from "@/components/PaycheckPlannerLogo";

type Billing = "monthly" | "annual";

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("annual");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileTierId, setMobileTierId] = useState<TierId>(
    VISIBLE_TIERS.find((t) => t.highlight)?.id ?? VISIBLE_TIERS[0].id
  );

  async function handleCheckout(tier: Tier) {
    setError(null);

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

    // No price wired up for this tier/billing combo. That's a config problem
    // (missing/empty NEXT_PUBLIC_STRIPE_* env var), so surface it instead of
    // silently bouncing to signup like before.
    if (!priceId) {
      console.error(
        `No Stripe price configured for ${tier.id} (${billing}). Check NEXT_PUBLIC_STRIPE_* env vars.`
      );
      setError(
        `This plan isn't available right now. Please try again later or email ${BRAND.supportEmail}.`
      );
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

      // Happy path: Stripe handed us a hosted checkout URL.
      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }

      // Not signed in yet — expected from the public pricing page. Send them
      // to sign up; they can come back and subscribe afterward.
      if (res.status === 401) {
        window.location.href = "/signup";
        return;
      }

      // Anything else is a genuine failure: an inactive/foreign price ID, a
      // Stripe-account mismatch, an outage, etc. Show it instead of hiding it.
      console.error("Checkout failed:", res.status, data);
      setError(
        `We couldn't start checkout. Please try again — if it keeps happening, email ${BRAND.supportEmail}.`
      );
    } catch (err) {
      console.error("Checkout request error:", err);
      setError("We couldn't reach checkout. Check your connection and try again.");
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
            {billing === "annual" ? "You're saving two months on every paid plan." : "\u00A0"}
          </p>
        </section>

        {/* Checkout error (only shown when something actually fails) */}
        {error && (
          <div
            role="alert"
            className="mx-auto mt-8 max-w-xl rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-200"
          >
            {error}
          </div>
        )}

        {/* Tier cards */}
        <section className={`mt-10 grid gap-6 ${VISIBLE_TIERS.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          {VISIBLE_TIERS.map((tier) => (
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

          {/* Desktop / tablet: full side-by-side table (plenty of width, no scrolling needed) */}
          <div className="mt-8 hidden overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40 md:block">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="bg-[#0f172a] px-5 py-4 text-sm font-semibold text-slate-300">
                    Feature
                  </th>
                  {VISIBLE_TIERS.map((t) => (
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

          {/* Mobile: pick one plan at a time, no horizontal scrolling at all */}
          <div className="mt-8 md:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {VISIBLE_TIERS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMobileTierId(t.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    mobileTierId === t.id
                      ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950"
                      : "border border-slate-700 text-slate-300"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
              {FEATURE_GROUPS.map((group) => (
                <div key={group.group}>
                  <div className="bg-[#0f172a] px-5 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {group.group}
                  </div>
                  {group.rows.map((row, i) => {
                    const value = row[mobileTierId];
                    return (
                      <div
                        key={row.label}
                        className={`flex items-center justify-between gap-3 px-5 py-3 ${
                          i % 2 ? "bg-slate-900/20" : ""
                        }`}
                      >
                        <span className="text-sm text-slate-300">{row.label}</span>
                        {typeof value === "string" ? (
                          <span className="shrink-0 text-right text-sm font-medium text-slate-200">
                            {value}
                          </span>
                        ) : value ? (
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                            <Check size={15} strokeWidth={3} aria-label="Included" />
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
                            <X size={15} strokeWidth={3} aria-label="Not included" />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
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
              Annual billing is ten months for the price of twelve — two months free
              on Momentum and Accelerate.
            </Faq>
            <Faq q="Do I need a card for the Free plan?">
              No. The Free plan stays free, no card required.
            </Faq>
            <Faq q="How do I get help?">
              Email us anytime at {BRAND.supportEmail}. Accelerate members get priority
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
    ? tier.priceAnnual
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
          {!isFree && (
            <span className="pb-1 text-sm text-slate-400">{annual ? "/yr" : "/mo"}</span>
          )}
        </div>
        <p className="mt-1 h-5 text-xs text-slate-500">
          {isFree
            ? "Free forever"
            : annual
            ? `$${tier.priceAnnual} billed yearly · 2 months free`
            : "Billed monthly"}
        </p>
      </div>

      <button
        type="button"
        onClick={onSelect}
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
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
          colSpan={VISIBLE_TIERS.length + 1}
          className="bg-[#0f172a] px-5 pt-5 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          {group}
        </td>
      </tr>
      {rows.map((row, i) => (
        <tr key={row.label} className={i % 2 ? "bg-slate-900/20" : ""}>
          <td className="bg-[#0f172a] px-5 py-3 text-sm text-slate-300">
            {row.label}
          </td>
          {VISIBLE_TIERS.map((col) => (
            <Cell key={col.id} value={row[col.id]} highlight={col.highlight} />
          ))}
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
