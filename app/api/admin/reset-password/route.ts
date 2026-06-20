import { NextResponse } from "next/server";
import { requireAdmin, serviceClient, logAdminAction } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

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

  // Audit the fact of a reset link being generated. The action_link itself is a
  // sensitive credential and is deliberately NOT stored in the log.
  await logAdminAction({
    actorId: gate.userId,
    actorEmail: gate.userEmail,
    action: "reset_password",
    targetId: userId,
    targetEmail: email,
  });

  return NextResponse.json({ ok: true, email, link: link.properties.action_link });
}