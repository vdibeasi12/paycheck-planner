import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug = body?.slug;
    const email = body?.email;

    if (!slug || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("money_score_results")
      .update({ email, email_captured_at: new Date().toISOString() })
      .eq("share_slug", slug);

    if (error) {
      console.error("money-score unlock error", error);
      return NextResponse.json({ error: "Failed to save email" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("money-score unlock exception", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}