import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/adminGuard";

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

  const [signupsRes, subsRes, scoreCompletedRes, scoreUnlockedRes, bankRes, referralRes] =
    await Promise.all([
      sb.from("events").select("user_id").eq("event_name", "signup_completed"),
      sb.from("events").select("user_id").eq("event_name", "subscription_started"),
      sb.from("events").select("metadata").eq("event_name", "money_score_completed"),
      sb.from("events").select("metadata").eq("event_name", "money_score_plan_unlocked"),
      sb.from("events").select("id", { count: "exact", head: true }).eq("event_name", "bank_connected"),
      sb.from("events").select("id", { count: "exact", head: true }).eq("event_name", "referral_completed"),
    ]);

  // Signup -> paid: of everyone who signed up since event tracking went
  // live, how many have also started a subscription. A pre-existing account
  // that subscribes without ever having a signup_completed event (it predates
  // this table) doesn't count on either side -- this is specifically the
  // post-tracking cohort, not an all-time ratio.
  const signupIds = new Set((signupsRes.data || []).map((r) => r.user_id).filter(Boolean));
  const paidIds = new Set((subsRes.data || []).map((r) => r.user_id).filter(Boolean));
  let signupToPaid = 0;
  for (const id of paidIds) if (signupIds.has(id)) signupToPaid++;

  // Money Score: completed -> plan unlocked, matched by share slug (both
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
  });
}
