import { NextResponse } from "next/server";
import { requireAdmin, serviceClient, logAdminAction } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

// POST { userId }: clear all of a user's MFA factors (lost-device recovery).
// After this the user signs in at AAL1 and can enroll a fresh authenticator
// from their account page. Admin-only; the admin never sees any secret.
export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => null);
  const userId =
    typeof body?.userId === "string" && body.userId
      ? body.userId
      : typeof body?.user_id === "string" && body.user_id
      ? body.user_id
      : "";
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const sb = serviceClient();

  const { data: list, error: listErr } = await sb.auth.admin.mfa.listFactors({
    userId,
  });
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const factors = list?.factors || [];
  let removed = 0;
  for (const f of factors) {
    const { error: delErr } = await sb.auth.admin.mfa.deleteFactor({
      id: f.id,
      userId,
    });
    if (!delErr) removed++;
  }

  const { data: got } = await sb.auth.admin.getUserById(userId);
  await logAdminAction({
    actorId: gate.userId,
    actorEmail: gate.userEmail,
    action: "reset_mfa",
    targetId: userId,
    targetEmail: got?.user?.email ?? null,
    metadata: { removed, total: factors.length },
  });

  return NextResponse.json({ ok: true, removed, total: factors.length });
}