import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/adminGuard";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { isInternalEmail } from "@/lib/internalAccounts";

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

  // Internal/team/personal-test accounts (see lib/internalAccounts.ts) --
  // excluded below so their own browsing of the app doesn't get counted as
  // real visitor traffic. Their *anonymous* page views (before they log in
  // on a given device) don't carry a user_id, so this also has to look up
  // every visitorId that account has EVER logged in from, not just filter
  // by user_id on the rows themselves.
  const { data: allProfiles } = await sb.from("profiles").select("id, email, is_admin");
  const internalUserIds = (allProfiles || [])
    .filter((p) => p.is_admin || isInternalEmail(p.email))
    .map((p) => p.id);

  let internalVisitorIds = new Set<string>();
  if (internalUserIds.length > 0) {
    const { data: internalEvents } = await sb
      .from("events")
      .select("metadata")
      .in("user_id", internalUserIds);
    internalVisitorIds = new Set(
      (internalEvents || [])
        .map((e) => (e.metadata as any)?.visitorId)
        .filter((v): v is string => !!v)
    );
  }

  // QA fix (Aug 29 2026): this used to be a single unbounded .select() over
  // the whole 30-day window. PostgREST caps an unbounded select at ~1000
  // rows, and page views alone were already landing right at that cap (993
  // reported for 30 days) -- meaning real page views past row #1000 were
  // being silently dropped, along with whatever cta_clicked rows fell after
  // them. fetchAllRows pages through with .range() so every row in the
  // window is counted no matter how much traffic there is.
  const [recentRowsRes, allTimeCountRes] = await Promise.all([
    fetchAllRows<{ created_at: string; event_name: string; metadata: unknown }>(
      (from, to) =>
        sb
          .from("events")
          .select("created_at, event_name, metadata")
          .in("event_name", ["page_view", "cta_clicked"])
          .gte("created_at", since30)
          .order("id", { ascending: true })
          .range(from, to)
    ),
    sb
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("event_name", "page_view"),
  ]);

  if (recentRowsRes.error) {
    return NextResponse.json({ error: recentRowsRes.error.message }, { status: 500 });
  }

  const rows = recentRowsRes.data.filter(
    (r) => !internalVisitorIds.has((r.metadata as any)?.visitorId)
  );
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
      // Not internal-filtered like the 30-day numbers above (an all-time
      // exclusion would need to paginate the whole table, not just a
      // head:true count) -- treat this one figure as a rough lifetime
      // total, not a clean visitor count.
      allTime: allTimeCountRes.count || 0,
    },
    bySource,
    ctaClicks: ctaTotals,
  });
}
