import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

// GET: visitor/traffic read model for the admin overview (Admin Phase 3,
// part 1 -- see handoff.md Section 5). Built on the same public.events table
// as Phases 1-2, reading the page_view/cta_clicked rows the public
// app/api/track endpoint writes. Deliberately the same posture as
// app/api/admin/events/route.ts: answer "is this capturing anything and
// what does it look like" rather than a full session-analytics engine.
//
// "Visitors" here means distinct pp_vid cookie values seen in page_view
// metadata, not authenticated users -- this is specifically top-of-funnel
// traffic (anonymous + logged-in alike), which is the gap the Phase 3
// recommendation called out: the funnel used to start at signup because
// there was no pre-signup tracking at all.
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const sb = serviceClient();
  const now = Date.now();
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayIso = startOfToday.toISOString();

  const [recentRes, allTimeCountRes] = await Promise.all([
    sb
      .from("events")
      .select("created_at, event_name, metadata")
      .in("event_name", ["page_view", "cta_clicked"])
      .gte("created_at", since30),
    sb
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("event_name", "page_view"),
  ]);

  if (recentRes.error) {
    return NextResponse.json({ error: recentRes.error.message }, { status: 500 });
  }

  const rows = recentRes.data || [];
  const pageViews = rows.filter((r) => r.event_name === "page_view");
  const ctaClicks = rows.filter((r) => r.event_name === "cta_clicked");

  const visitorsIn = (sinceIso: string) => {
    const ids = new Set<string>();
    for (const r of pageViews) {
      if (r.created_at < sinceIso) continue;
      const vid = (r.metadata as any)?.visitorId;
      if (vid) ids.add(vid);
    }
    return ids.size;
  };

  const pageViewsIn = (sinceIso: string) => pageViews.filter((r) => r.created_at >= sinceIso).length;

  // Visitors by source, last 30 days -- deduped by visitor id so a single
  // person browsing several pages counts once per source, matching the
  // existing "Traffic source (auto-detected)" signup card's granularity
  // (visitors, not raw page-view rows) so the two can be read side by side
  // as a rough visitor -> signup conversion per channel.
  const bySourceVisitors = new Map<string, Set<string>>();
  for (const r of pageViews) {
    const meta = r.metadata as any;
    const source = (meta?.source as string | null) || "unknown";
    const vid = meta?.visitorId as string | null;
    if (!vid) continue;
    if (!bySourceVisitors.has(source)) bySourceVisitors.set(source, new Set());
    bySourceVisitors.get(source)!.add(vid);
  }
  const bySource: Record<string, number> = {};
  for (const [source, ids] of bySourceVisitors.entries()) bySource[source] = ids.size;

  const ctaTotals: Record<string, number> = {};
  for (const r of ctaClicks) {
    const cta = ((r.metadata as any)?.cta as string | null) || "unknown";
    ctaTotals[cta] = (ctaTotals[cta] || 0) + 1;
  }

  return NextResponse.json({
    uniqueVisitors: {
      today: visitorsIn(todayIso),
      last7: visitorsIn(since7),
      last30: visitorsIn(since30),
    },
    pageViews: {
      today: pageViewsIn(todayIso),
      last7: pageViewsIn(since7),
      last30: pageViewsIn(since30),
      allTime: allTimeCountRes.count || 0,
    },
    bySource,
    ctaClicks: ctaTotals,
  });
}
