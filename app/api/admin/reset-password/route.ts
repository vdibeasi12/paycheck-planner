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

// POST { userId }: generate a one-time password-recovery link for a user.
// Returns the action_link so the admin can copy it to the user over a trusted
// channel. Supabase also emails the link if email is configured. The admin
// never sees or sets the user's password.
export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => null);
  const userId = body?.userId;
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const sb = serviceClient();

  const { data: got, error: getErr } = await sb.auth.admin.getUserById(userId);
  const email = got?.user?.email;
  if (getErr || !email) {
    return NextResponse.json(
      { error: getErr?.message || "User not found or has no email" },
      { status: 404 }
    );
  }

  const { data: link, error: linkErr } = await sb.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  if (linkErr || !link?.properties?.action_link) {
    return NextResponse.json(
      { error: linkErr?.message || "Could not generate recovery link" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, email, link: link.properties.action_link });
}