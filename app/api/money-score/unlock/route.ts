import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { resend } from "@/lib/email";
import {
  getScoreBand,
  type MoneyScoreCategory,
  type MoneyScoreCategoryResult,
} from "@/lib/money-score";
import { buildMoneyScorePlanEmail } from "@/lib/money-score-email";
import { track } from "@/lib/track";

// Same helper as app/api/money-score/submit/route.ts -- deliberately reads
// the pp_attr cookie again here rather than selecting source/medium/campaign
// back off the row, since the anon/authenticated SELECT grant on
// money_score_results (20260813060000_lock_down_money_score_results.sql)
// only covers share_slug/score/category_scores/created_at/has_email; those
// attribution columns are readable by the service role only.
function readAttribution(cookieHeader: {
  get: (name: string) => { value: string } | undefined;
}) {
  let source: string | null = null;
  let medium: string | null = null;
  let campaign: string | null = null;
  try {
    const raw = cookieHeader.get("pp_attr")?.value;
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw));
      source = typeof parsed.source === "string" ? parsed.source.slice(0, 100) : null;
      medium = typeof parsed.medium === "string" ? parsed.medium.slice(0, 100) : null;
      campaign = typeof parsed.campaign === "string" ? parsed.campaign.slice(0, 100) : null;
    }
  } catch {
    // Malformed/missing cookie -- attribution is a nice-to-have, never block the unlock on it.
  }
  return { source, medium, campaign };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const slug = body?.slug;
    const email = body?.email;

    if (!slug || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("money_score_results")
      .update({ email, email_captured_at: new Date().toISOString() })
      .eq("share_slug", slug)
      .select("share_slug, score, category_scores")
      .single();

    if (error || !data) {
      console.error("money-score unlock error", error);
      return NextResponse.json({ error: "Failed to save email" }, { status: 500 });
    }

    // This is the actual conversion point in the marketing flow (email
    // captured in exchange for the personalized plan) -- worth its own
    // event distinct from money_score_completed.
    const cookieStore = await cookies();
    const { source, medium, campaign } = readAttribution(cookieStore);
    await track("money_score_plan_unlocked", {
      metadata: { slug: data.share_slug, score: data.score, source, medium, campaign },
    });

    // Best-effort: send the personalized plan email. A failure here should
    // never block the user from seeing their unlocked results -- they've
    // already gotten the thing of value (their score); the email is a
    // bonus delivery on top of that, not a gate.
    const from = process.env.EMAIL_FROM;
    if (from) {
      try {
        const band = getScoreBand(data.score);
        const categoryScores = data.category_scores as Record<
          MoneyScoreCategory,
          MoneyScoreCategoryResult
        >;
        const { subject, html } = buildMoneyScorePlanEmail(
          data.score,
          band,
          categoryScores,
          data.share_slug
        );
        const result = await resend.emails.send({ from, to: email, subject, html });
        if (result && (result as any).error) {
          console.error("money-score plan email error", (result as any).error);
        }
      } catch (emailErr) {
        console.error("money-score plan email exception", emailErr);
      }
    } else {
      console.warn("EMAIL_FROM not set -- skipping money score plan email");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("money-score unlock exception", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
