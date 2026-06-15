import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// --- access control: caller must be a logged-in admin ---
async function requireAdmin() {
  const userClient = await createUserClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Unauthorized" };

  const { data: profile } = await userClient
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, userId: user.id };
}

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  );
}

function monthlyValue(tier: string | null, planType: string | null) {
  const base = tier === "premium" ? 6 : tier === "starter" ? 3 : 0;
  const annual = planType === "annual" || planType === "yearly";
  return annual ? (base * 11) / 12 : base;
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const q = (new URL(req.url).searchParams.get("q") || "").toLowerCase();
  const sb = serviceClient();

  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUsers = list?.users || [];

  const [{ data: profiles }, { data: subs }] = await Promise.all([
    sb.from("profiles").select("id, plan, is_admin"),
    sb.from("subscriptions").select("user_id, tier, status, plan_type, current_period_end"),
  ]);

  const pMap = new Map((profiles || []).map((p) => [p.id, p]));
  const sMap = new Map<string, any>();
  (subs || []).forEach((s) => {
    if (!sMap.has(s.user_id)) sMap.set(s.user_id, s);
  });

  let rows = authUsers.map((u) => {
    const p = pMap.get(u.id);
    const s = sMap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "(no email)",
      created_at: u.created_at,
      plan: p?.plan ?? "free",
      is_admin: !!p?.is_admin,
      sub_tier: s?.tier ?? null,
      sub_status: s?.status ?? null,
      sub_plan_type: s?.plan_type ?? null,
    };
  });

  if (q) rows = rows.filter((r) => r.email.toLowerCase().includes(q));
  rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const now = Date.now();
  const signups30 = authUsers.filter(
    (u) => now - new Date(u.created_at).getTime() < 30 * 864e5
  ).length;
  const activeSubs = (subs || []).filter(
    (s) => s.status === "active" || s.status === "trialing"
  );
  const mrr = activeSubs.reduce((sum, s) => sum + monthlyValue(s.tier, s.plan_type), 0);

  return NextResponse.json({
    metrics: {
      totalUsers: authUsers.length,
      signups30,
      activeSubs: activeSubs.length,
      mrr: Math.round(mrr * 100) / 100,
    },
    users: rows,
  });
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => null);
  if (!body?.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Don't let an admin remove their own admin and lock themselves out.
  if (body.userId === gate.userId && body.is_admin === false) {
    return NextResponse.json({ error: "You can't remove your own admin access." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.plan === "string" && ["free", "starter", "premium"].includes(body.plan)) {
    update.plan = body.plan;
  }
  if (typeof body.is_admin === "boolean") update.is_admin = body.is_admin;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing valid to update" }, { status: 400 });
  }

  const sb = serviceClient();
  const { error } = await sb.from("profiles").update(update).eq("id", body.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
