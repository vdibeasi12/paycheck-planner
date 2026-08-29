import { NextResponse } from "next/server";
import { requireAdmin, serviceClient, logAdminAction } from "@/lib/adminGuard";
import { plaid, PLAID_ENABLED } from "@/lib/plaid";
import { TIERS } from "@/lib/plans";

export const dynamic = "force-dynamic";

// QA fix (Aug 29 2026): this used to hardcode its own copy of each tier's
// price ($11.99/$119.99 for Autopilot) instead of reading lib/plans.ts,
// the single source of truth pricing/checkout actually uses. It had
// drifted -- Autopilot is really $12.99/mo, $129.99/yr -- so MRR was quietly
// under-counting every Autopilot subscriber. Deriving straight from TIERS
// means this can't drift again.
const priceByTier = new Map(TIERS.map((t) => [t.id, t]));

function monthlyValue(tier: string | null, planType: string | null) {
  const t = tier ? priceByTier.get(tier as (typeof TIERS)[number]["id"]) : undefined;
  if (!t) return 0;
  const isAnnual = planType === "annual" || planType === "yearly";
  return isAnnual ? t.priceAnnual / 12 : t.priceMonthly;
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
    sb.from("profiles").select("id, plan, is_admin, signup_source, utm_source, utm_medium, utm_campaign, utm_content"),
    sb.from("subscriptions").select("user_id, tier, status, plan_type, current_period_end, stripe_subscription_id"),
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
      utm_source: p?.utm_source ?? null,
      utm_medium: p?.utm_medium ?? null,
      utm_campaign: p?.utm_campaign ?? null,
      utm_content: p?.utm_content ?? null,
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

  // A "real" subscription is one Stripe's webhook actually wrote (it carries
  // stripe_subscription_id -- see upsertSubscription in app/api/webhook/route.ts),
  // for a user that still exists and isn't an admin/test account. Rows without
  // a stripe_subscription_id were inserted by hand (demo/test seeding, e.g.
  // SUPABASE_SETUP_COMPLETE.sql's "premium-demo" user) and never represented
  // real revenue, so they must never count toward MRR or Active Subs -- same
  // standard the Paid users / Free->Paid fix below already applies.
  const authUserIds = new Set(authUsers.map((u) => u.id));
  const realSubs = (subs || []).filter(
    (s) =>
      !!s.stripe_subscription_id &&
      authUserIds.has(s.user_id) &&
      !pMap.get(s.user_id)?.is_admin
  );

  const activeSubs = realSubs.filter(
    (s) => s.status === "active" || s.status === "trialing"
  );
  const mrr = activeSubs.reduce((sum, s) => sum + monthlyValue(s.tier, s.plan_type), 0);

  const signupSources: Record<string, number> = {};
  (profiles || []).forEach((p) => {
    const src = ((p.signup_source as string | null) || "").trim() || "unknown";
    signupSources[src] = (signupSources[src] || 0) + 1;
  });

  // Auto-captured traffic attribution (UTM param or classified referrer),
  // separate from the self-reported "How did you hear about us?" dropdown
  // above -- this one is populated automatically for every new signup.
  const utmSources: Record<string, number> = {};
  (profiles || []).forEach((p) => {
    const src = ((p.utm_source as string | null) || "").trim() || "unknown";
    utmSources[src] = (utmSources[src] || 0) + 1;
  });

  // Plan mix, paid-user count, and conversion rate (QA fix, Aug 15 2026):
  // these three used to trust profiles.plan alone, with no join to real
  // billing state and no exclusion of admin/internal accounts. Two
  // problems: (1) profiles.plan is hand-editable from the Users tab above
  // (see the PATCH handler) with no subscription behind it, so a comped
  // or internally-testing account showed up as a paying customer; (2) an
  // admin's own login (Vince's account, test/QA accounts) isn't a real
  // customer and shouldn't count toward conversion either way. MRR and
  // Active Subs are now sourced from the same `realSubs`/`activeSubs`
  // filtered above, so all five numbers agree on what counts as a real,
  // paying, non-admin subscriber.
  const activeSubByUser = new Map(activeSubs.map((s) => [s.user_id, s]));
  const nonAdminUsers = authUsers.filter((u) => !pMap.get(u.id)?.is_admin);

  const planCounts: Record<string, number> = { free: 0, starter: 0, premium: 0, connected: 0 };
  nonAdminUsers.forEach((u) => {
    const plan = (activeSubByUser.get(u.id)?.tier as string) || "free";
    planCounts[plan] = (planCounts[plan] || 0) + 1;
  });
  const totalUsers = authUsers.length;
  const paidUsers = nonAdminUsers.filter((u) => activeSubByUser.has(u.id)).length;
  const conversion =
    nonAdminUsers.length > 0 ? (paidUsers / nonAdminUsers.length) * 100 : 0;
  const canceledSubs = realSubs.filter(
    (s) => s.status === "canceled" || s.status === "cancelled"
  ).length;

  return NextResponse.json({
    metrics: {
      totalUsers,
      signups30,
      activeSubs: activeSubs.length,
      mrr: Math.round(mrr * 100) / 100,
      signupSources,
      utmSources,
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

  // Audit: resolve target email once for readable logs, then write one row per
  // distinct change (plan vs admin-grant/revoke).
  const { data: got } = await sb.auth.admin.getUserById(body.userId);
  const targetEmail = got?.user?.email ?? null;
  if (typeof update.plan === "string") {
    await logAdminAction({
      actorId: gate.userId,
      actorEmail: gate.userEmail,
      action: "plan_change",
      targetId: body.userId,
      targetEmail,
      metadata: { plan: update.plan },
    });
  }
  if (typeof update.is_admin === "boolean") {
    await logAdminAction({
      actorId: gate.userId,
      actorEmail: gate.userEmail,
      action: update.is_admin ? "grant_admin" : "revoke_admin",
      targetId: body.userId,
      targetEmail,
    });
  }

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

  // 1) Revoke any linked banks at Plaid's end first, while we still have
  //    their access tokens. plaid_items (and plaid_accounts/plaid_liabilities,
  //    which cascade from it) already gets cleaned up locally by the
  //    auth-user cascade in step 3 below -- ON DELETE CASCADE to
  //    auth.users is already in place on all three tables. What was
  //    actually missing (QA fix, Aug 15 2026) is telling Plaid itself the
  //    Item is gone: without this, the bank connection stayed live and
  //    billable on Plaid's side forever after the account disappeared
  //    from our own database, exactly like app/api/plaid/disconnect/route.ts
  //    already does for a user-initiated disconnect. Best-effort, same as
  //    that route -- a Plaid outage shouldn't block an account deletion.
  const { data: plaidItems } = await sb
    .from("plaid_items")
    .select("item_id, access_token")
    .eq("user_id", userId);
  for (const item of plaidItems ?? []) {
    if (PLAID_ENABLED) {
      try {
        await plaid.itemRemove({ access_token: item.access_token });
      } catch (e) {
        console.error(
          "Plaid itemRemove failed during admin user deletion for",
          item.item_id,
          (e as any)?.response?.data || (e as any)?.message || e
        );
      }
    }
  }

  // 2) Purge all app data in one transaction.
  const { error: purgeErr } = await sb.rpc("app_admin_purge_user", { p_uid: userId });
  if (purgeErr) {
    return NextResponse.json({ error: "Data purge failed: " + purgeErr.message }, { status: 500 });
  }

  // 3) Remove the auth user (also revokes their sessions, and cascades
  //    the deletion of plaid_items/plaid_accounts/plaid_liabilities).
  const { error: authErr } = await sb.auth.admin.deleteUser(userId);
  if (authErr) {
    return NextResponse.json({ error: "Auth deletion failed: " + authErr.message }, { status: 500 });
  }

  await logAdminAction({
    actorId: gate.userId,
    actorEmail: gate.userEmail,
    action: "delete_user",
    targetId: userId,
    targetEmail: email,
  });

  return NextResponse.json({ ok: true, email });
}