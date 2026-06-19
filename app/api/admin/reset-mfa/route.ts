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

  return NextResponse.json({ ok: true, removed, total: factors.length });
}