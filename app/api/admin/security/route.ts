import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

// GET: the admin Security tab's data. Two things worth knowing at a glance
// that weren't visible anywhere before:
//   1. Every admin account and whether it actually has a verified MFA
//      factor -- an admin account without one is the single highest-value
//      target on the whole site, and there was previously no way to see
//      this without checking each user individually.
//   2. Which anonymous-form rate-limit buckets have been hit hard enough to
//      actually block requests in the last 24h (count exceeded the 5/hour
//      limit) -- an early signal of bot/scraper traffic on the public
//      subscribe endpoints.
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const sb = serviceClient();

  const { data: adminProfiles, error: adminErr } = await sb
    .from("profiles")
    .select("id, email")
    .eq("is_admin", true);

  if (adminErr) return NextResponse.json({ error: adminErr.message }, { status: 500 });

  const admins = await Promise.all(
    (adminProfiles || []).map(async (p) => {
      const { data } = await sb.auth.admin.mfa.listFactors({ userId: p.id });
      const factors = data?.factors || [];
      return {
        id: p.id,
        email: p.email,
        hasVerifiedFactor: factors.some((f) => f.status === "verified"),
        factorCount: factors.length,
      };
    })
  );

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: rateLimitRows } = await sb
    .from("anon_rate_limits")
    .select("bucket, ip, count, window_start")
    .gt("count", 5)
    .gte("window_start", since24h)
    .order("count", { ascending: false })
    .limit(20);

  return NextResponse.json({
    admins,
    rateLimitBlocks24h: rateLimitRows || [],
  });
}
