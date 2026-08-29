import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

// Known event names we track today (lib/track.ts callers + the DB triggers
// in supabase/migrations/20260813080000_events_table.sql). Keep this in
// sync with EVENT_LABELS in app/admin/page.tsx.
const EVENT_NAMES = [
  "signup_completed",
  "onboarding_completed",
  "checkout_started",
  "subscription_started",
  "subscription_canceled",
  "bank_connected",
  "money_score_completed",
  "money_score_plan_unlocked",
  "lead_magnet_subscribed",
  "referral_completed",
  "referral_click",
] as const;

// GET: a minimal read model over public.events for the admin dashboard --
// counts by event name (all-time and last 30 days) plus a short recent feed.
//
// QA fix (Aug 29 2026): this used to pull every row in the table with an
// unbounded `.select("event_name, created_at")` and tally totals in
// JavaScript. PostgREST caps an unbounded select at ~1000 rows by default,
// so once total event volume crossed that cap, whichever event types
// happened to fall outside the returned page silently reported as 0 here
// (confirmed live: signup_completed and referral_click both had real rows
// in the table but showed 0 on this dashboard). Counting each known event
// name individually with a `head:true, count:"exact"` query asks Postgres
// for a row count directly -- no rows are transferred, so there's no cap to
// hit no matter how large the table gets.
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const sb = serviceClient();
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [counts, recentRes] = await Promise.all([
    Promise.all(
      EVENT_NAMES.map(async (name) => {
        const [allRes, last30Res] = await Promise.all([
          sb.from("events").select("id", { count: "exact", head: true }).eq("event_name", name),
          sb
            .from("events")
            .select("id", { count: "exact", head: true })
            .eq("event_name", name)
            .gte("created_at", since30),
        ]);
        return {
          name,
          all: allRes.count ?? 0,
          last30: last30Res.count ?? 0,
          error: allRes.error || last30Res.error || null,
        };
      })
    ),
    sb
      .from("events")
      .select("id, created_at, event_name, user_id, metadata")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const firstError = counts.find((c) => c.error)?.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }
  if (recentRes.error) {
    return NextResponse.json({ error: recentRes.error.message }, { status: 500 });
  }

  const totals: Record<string, number> = {};
  const last30: Record<string, number> = {};
  for (const c of counts) {
    totals[c.name] = c.all;
    last30[c.name] = c.last30;
  }

  return NextResponse.json({
    totals,
    last30,
    recent: recentRes.data || [],
  });
}
