import { NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const sb = serviceClient();
  const { data, error } = await sb
    .from("feedback")
    .select("id, created_at, email, sentiment, message, status")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ feedback: data || [] });
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => null);
  const id = body?.id;
  const status = body?.status;
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  if (status !== "open" && status !== "resolved") {
    return NextResponse.json({ error: "status must be 'open' or 'resolved'" }, { status: 400 });
  }

  const sb = serviceClient();
  const { error } = await sb.from("feedback").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => null);
  const id = body?.id;
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const sb = serviceClient();
  const { error } = await sb.from("feedback").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}