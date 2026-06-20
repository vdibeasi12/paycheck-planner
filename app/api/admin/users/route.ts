import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
  const base =
    tier === "connected" ? 10 : tier === "premium" ? 6 : tier === "starter" ? 3 : 0;
  const annual = planType === "annual" || planType === "yearly";
  return annual ? (base * 10) / 12 : base;
}

const ASSIGNABLE_PLANS = ["free", "starter", "premium", "connected"];

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const q = (new URL(req.url).searchParams.get("q") || "").toLowerCase();
  const sb = serviceClient();

  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUsers = list?.users || [];

  const [{ data: profiles }, { data: subs }] = await Promise.all([
    sb.from("profiles").select("id, plan, is_admin, signup_source"),
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
      signup_source: p?.signup_source ?? null,
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

  const signupSources: Record<string, number> = {};
  (profiles || []).forEach((p) => {
    const src = ((p.signup_source as string | null) || "").trim() || "unknown";
    signupSources[src] = (signupSources[src] || 0) + 1;
  });

  // Plan mix across every user (no profile row -> counts as free).
  const planCounts: Record<string, number> = { free: 0, starter: 0, premium: 0, connected: 0 };
  authUsers.forEach((u) => {
    const plan = ((pMap.get(u.id)?.plan as string) || "free");
    planCounts[plan] = (planCounts[plan] || 0) + 1;
  });
  const totalUsers = authUsers.length;
  const paidUsers = totalUsers - (planCounts.free || 0);
  const conversion = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;
  const canceledSubs = (subs || []).filter(
    (s) => s.status === "canceled" || s.status === "cancelled"
  ).length;

  return NextResponse.json({
    metrics: {
      totalUsers,
      signups30,
      activeSubs: activeSubs.length,
      mrr: Math.round(mrr * 100) / 100,
      signupSources,
      planCounts,
      paidUsers,
      conversion: Math.round(conversion * 10) / 10,
      canceledSubs,
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
  if (typeof body.plan === "string" && ASSIGNABLE_PLANS.includes(body.plan)) {
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

// Permanently delete a user and purge all of their data. Guards: cannot delete
// yourself, cannot delete another admin (demote first), and the caller must pass
// the exact confirmEmail. Data purge runs in one transaction via the
// app_admin_purge_user function; then the auth user is removed.
export async function DELETE(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => null);
  const userId = body?.userId;
  const confirmEmail = body?.confirmEmail;

  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (userId === gate.userId) {
    return NextResponse.json({ error: "You can't delete your own account from here." }, { status: 400 });
  }

  const sb = serviceClient();

  const { data: got } = await sb.auth.admin.getUserById(userId);
  const email = got?.user?.email;
  if (!email) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (typeof confirmEmail !== "string" || confirmEmail.trim().toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Confirmation email does not match." }, { status: 400 });
  }

  const { data: prof } = await sb
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (prof?.is_admin) {
    return NextResponse.json(
      { error: "This user is an admin. Remove their admin access before deleting." },
      { status: 400 }
    );
  }

  // 1) Purge all app data in one transaction.
  //    (Plaid /item/remove will be called here once Plaid Phase 0 ships.)
  const { error: purgeErr } = await sb.rpc("app_admin_purge_user", { p_uid: userId });
  if (purgeErr) {
    return NextResponse.json({ error: "Data purge failed: " + purgeErr.message }, { status: 500 });
  }

  // 2) Remove the auth user (also revokes their sessions).
  const { error: authErr } = await sb.auth.admin.deleteUser(userId);
  if (authErr) {
    return NextResponse.json({ error: "Auth deletion failed: " + authErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email });
}