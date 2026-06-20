import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

// GET: read-only recent admin audit trail (newest first). Admin-gated and
// AAL2-gated via the shared requireAdmin guard; read via service-role because
// admin_audit_log has RLS on with no policies.
export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const limitParam = Number(new URL(req.url).searchParams.get("limit"));
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 500)
    : 200;

  const sb = serviceClient();
  const { data, error } = await sb
    .from("admin_audit_log")
    .select("id, created_at, actor_id, actor_email, action, target_id, target_email, metadata")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ log: data || [] });
}