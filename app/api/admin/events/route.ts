import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

// GET: a minimal read model over public.events for the admin dashboard --
// counts by event name (all-time and last 30 days) plus a short recent feed.
// Deliberately not a funnel/conversion-rate calculator yet; that's worth
// building once there's real traffic through these events to make it
// meaningful. For now this just answers "is tracking actually capturing
// anything, and what does volume look like."
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const sb = serviceClient();
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [allRes, recentRes] = await Promise.all([
    sb.from("events").select("event_name, created_at"),
    sb
      .from("events")
      .select("id, created_at, event_name, user_id, metadata")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (allRes.error) {
    return NextResponse.json({ error: allRes.error.message }, { status: 500 });
  }

  const totals: Record<string, number> = {};
  const last30: Record<string, number> = {};
  for (const row of allRes.data || []) {
    totals[row.event_name] = (totals[row.event_name] || 0) + 1;
    if (row.created_at >= since30) {
      last30[row.event_name] = (last30[row.event_name] || 0) + 1;
    }
  }

  return NextResponse.json({
    totals,
    last30,
    recent: recentRes.data || [],
  });
}
