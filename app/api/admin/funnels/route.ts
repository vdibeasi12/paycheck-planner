import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/adminGuard";
import { TIERS } from "@/lib/plans";

export const dynamic = "force-dynamic";

// GET: conversion-rate views built on top of public.events (Admin Phase 2).
// These are cohort matches, not simple ratios of two counts -- see the
// comments below for exactly what each number measures. Volume is low right
// now since event tracking only just went live; treat small-sample rates as
// directional, not final, until there's more traffic through them.
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const sb = serviceClient();

  const [
    signupsRes,
    subsRes,
    scoreCompletedRes,
    scoreUnlockedRes,
    bankRes,
    referralRes,
    profilesRes,
    incomeRes,
    completedReferralsRes,
    subscriptionStatusRes,
    checkoutStartedRes,
  ] = await Promise.all([
    sb.from("events").select("user_id").eq("event_name", "signup_completed"),
    sb.from("events").select("user_id").eq("event_name", "subscription_started"),
    sb.from("events").select("metadata").eq("event_name", "money_score_completed"),
    sb.from("events").select("metadata").eq("event_name", "money_score_plan_unlocked"),
    sb.from("events").select("id", { count: "exact", head: true }).eq("event_name", "bank_connected"),
    sb.from("events").select("id", { count: "exact", head: true }).eq("event_name", "referral_completed"),
    sb
      .from("profiles")
      .select("id, email, utm_source, utm_campaign, utm_content, plan, is_admin, created_at, onboarded, last_active_at"),
    sb.from("income").select("user_id"),
    sb.from("referrals").select("referrer_id, referred_id").eq("status", "completed"),
    sb.from("subscriptions").select("user_id, status"),
    sb.from("events").select("user_id").eq("event_name", "checkout_started"),
  ]);

  // Real "paid" state for the bySource/byCampaign breakdown below (QA fix,
  // Aug 15 2026) -- same root cause as app/api/admin/users/route.ts's
  // paidUsers/conversion fix: profiles.plan is hand-editable with no
  // subscription behind it, so it alone isn't a reliable "paid" signal.
  // Admin/internal accounts are also excluded from this whole breakdown --
  // they're real rows in `profiles` but not real marketing-funnel signups.
  const activeSubUserIds = new Set(
    (subscriptionStatusRes.data || [])
      .filter((s) => s.status === "active" || s.status === "trialing")
      .map((s) => s.user_id)
  );
  const funnelProfiles = (profilesRes.data || []).filter((p) => !p.is_admin);

  // Signup -> paid: of everyone who signed up since event tracking went
  // live, how many have also started a subscription. A pre-existing account
  // that subscribes without ever having a signup_completed event (it predates
  // this table) doesn't count on either side -- this is specifically the
  // post-tracking cohort, not an all-time ratio.
  const signupIds = new Set((signupsRes.data || []).map((r) => r.user_id).filter(Boolean));
  const paidIds = new Set((subsRes.data || []).map((r) => r.user_id).filter(Boolean));
  let signupToPaid = 0;
  for (const id of paidIds) if (signupIds.has(id)) signupToPaid++;

  // Money Quiz: completed -> plan unlocked, matched by share slug (both
  // events carry it in metadata; there's no user_id to join on since the
  // quiz itself is anonymous).
  const completedSlugs = new Set(
    (scoreCompletedRes.data || []).map((r) => (r.metadata as any)?.slug).filter(Boolean)
  );
  const unlockedSlugs = new Set(
    (scoreUnlockedRes.data || []).map((r) => (r.metadata as any)?.slug).filter(Boolean)
  );
  let scoreToUnlock = 0;
  for (const slug of unlockedSlugs) if (completedSlugs.has(slug)) scoreToUnlock++;

  const ratePct = (num: number, den: number) =>
    den > 0 ? Math.round((num / den) * 1000) / 10 : null;

  // Per-source Signups -> Activated -> Paid, all-time (not the last-30d
  // window the visitors endpoint uses for top-of-funnel traffic -- these
  // three columns are a true cohort, joined by user id, so the conversion
  // rate is real; "visitors" gets merged in client-side as a directional
  // top-of-funnel reference alongside it, not part of the same cohort).
  // "Activated" = added at least one paycheck (lib/onboarding-sequence.ts's
  // own Day-1 framing: everything else in the app starts from this step).
  const activatedIds = new Set((incomeRes.data || []).map((r: any) => r.user_id).filter(Boolean));

  const bySource: Record<string, { signups: number; activated: number; paid: number }> = {};
  // Same idea, one level more granular -- keyed by campaign, or
  // "campaign • content" when a specific video/ad id (utm_content) was
  // tagged on the link. Only counts profiles that actually carry a
  // campaign; untagged organic/direct traffic has no campaign to group by
  // and stays out of this table (it's already covered by the source table).
  const byCampaign: Record<string, { signups: number; activated: number; paid: number }> = {};
  for (const p of funnelProfiles) {
    const src = ((p.utm_source as string | null) || "").trim() || "direct";
    if (!bySource[src]) bySource[src] = { signups: 0, activated: 0, paid: 0 };
    bySource[src].signups++;
    if (activatedIds.has(p.id)) bySource[src].activated++;
    if (activeSubUserIds.has(p.id)) bySource[src].paid++;

    const campaign = ((p.utm_campaign as string | null) || "").trim();
    if (campaign) {
      const content = ((p.utm_content as string | null) || "").trim();
      const key = content ? `${campaign} • ${content}` : campaign;
      if (!byCampaign[key]) byCampaign[key] = { signups: 0, activated: 0, paid: 0 };
      byCampaign[key].signups++;
      if (activatedIds.has(p.id)) byCampaign[key].activated++;
      if (activeSubUserIds.has(p.id)) byCampaign[key].paid++;
    }
  }

  // Top referrers + estimated revenue from referrals, both from the same
  // completed-referrals query. Revenue is an estimate: it's each referred
  // user's current plan list price (monthly), regardless of whether they're
  // actually billed monthly or annually -- directional, like the funnel
  // rates above, not a reconciled dollar figure off Stripe.
  const profileById = new Map((profilesRes.data || []).map((p) => [p.id, p]));
  const priceByTier = new Map(TIERS.map((t) => [t.id, t.priceMonthly]));

  const referrerCounts = new Map<string, number>();
  let referralRevenueMonthly = 0;
  for (const r of completedReferralsRes.data || []) {
    if (r.referrer_id) referrerCounts.set(r.referrer_id, (referrerCounts.get(r.referrer_id) || 0) + 1);
    const referredPlan = profileById.get(r.referred_id)?.plan as string | undefined;
    if (referredPlan) referralRevenueMonthly += priceByTier.get(referredPlan as any) || 0;
  }
  const topReferrers = Array.from(referrerCounts.entries())
    .map(([id, count]) => ({ email: profileById.get(id)?.email || id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Named product funnel (Aug 23 2026 conversion-optimization pass, per
  // ChatGPT's homepage review once the round-3 redesign shipped: "stop
  // redesigning, start measuring" -- Visitor -> Start Free -> Sign Up ->
  // Complete Onboarding -> Create First Paycheck -> Return -> Upgrade).
  // "Visitors" and "Start Free clicks" are anonymous/session-based
  // (page_view / cta_clicked, see /api/admin/visitors) and merged in
  // client-side as directional top-of-funnel context; everything from
  // Signed Up onward here is a real cohort of the same non-admin profiles,
  // so each step-to-step rate is an exact conversion, not an estimate.
  // "Onboarded" reads profiles.onboarded directly (set by
  // /api/onboarding/complete) rather than the onboarding_completed event
  // alone, so it stays accurate for accounts that onboarded before this
  // event existed. "Checkout started" = a real Stripe Checkout Session was
  // created (app/api/stripe/checkout/route.ts), independent of whether it
  // was ever completed. "Returning" = came back on a later calendar day
  // than they signed up (profiles.last_active_at, updated on every
  // dashboard load).
  const checkoutStartedIds = new Set(
    (checkoutStartedRes.data || []).map((r: any) => r.user_id).filter(Boolean)
  );
  const dayOf = (iso: string) => iso.slice(0, 10);
  const onboardedCount = funnelProfiles.filter((p: any) => p.onboarded).length;
  const activatedCount = funnelProfiles.filter((p) => activatedIds.has(p.id)).length;
  const checkoutStartedCount = funnelProfiles.filter((p) => checkoutStartedIds.has(p.id)).length;
  const paidCount = funnelProfiles.filter((p) => activeSubUserIds.has(p.id)).length;
  const returningCount = funnelProfiles.filter(
    (p: any) => p.last_active_at && p.created_at && dayOf(p.last_active_at) !== dayOf(p.created_at)
  ).length;

  const productFunnel = {
    signups: funnelProfiles.length,
    onboarded: onboardedCount,
    activated: activatedCount,
    checkoutStarted: checkoutStartedCount,
    paid: paidCount,
    returning: returningCount,
  };

  return NextResponse.json({
    signupToPaid: {
      signups: signupIds.size,
      paid: signupToPaid,
      ratePct: ratePct(signupToPaid, signupIds.size),
    },
    moneyScoreToUnlock: {
      completed: completedSlugs.size,
      unlocked: scoreToUnlock,
      ratePct: ratePct(scoreToUnlock, completedSlugs.size),
    },
    bankConnectedTotal: bankRes.count || 0,
    referralsCompletedTotal: referralRes.count || 0,
    bySource,
    byCampaign,
    topReferrers,
    referralRevenueMonthly: Math.round(referralRevenueMonthly * 100) / 100,
    productFunnel,
  });
}
