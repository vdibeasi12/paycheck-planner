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
import { checkAnonRateLimit, getClientIp } from "@/lib/anonRateLimit";

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

    // SECURITY FIX (Sep 11 2026, audit). This route is public, takes the
    // destination address straight from the request body, and had NO rate
    // limit -- the only public email-sending route in the app that skipped
    // checkAnonRateLimit (contact, blog/subscribe, lead-magnet, challenge and
    // university subscribe all call it). Together with a public, unlimited
    // submit route for minting slugs, that was a working email bomb:
    // unlimited mail to any address an attacker picked, sent from this app's
    // own verified sending domain, billed here, and spending its sending
    // reputation.
    //
    // Two independent limits, because either one alone is bypassable:
    //   1. a per-IP rate limit here, and
    //   2. one email per RESULT ROW, enforced by .is("email", null) below --
    //      so even an attacker with many IPs cannot make one slug send twice,
    //      and minting fresh slugs is now rate-limited at submit.
    const underLimit = await checkAnonRateLimit("money-score-unlock", getClientIp(req));
    if (!underLimit) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const supabase = await createClient();
    // .is("email", null) makes this claim-once: it matches only a result that
    // has not been unlocked yet, so a repeat unlock of the same slug matches
    // no row and sends nothing.
    const { data, error } = await supabase
      .from("money_score_results")
      .update({ email, email_captured_at: new Date().toISOString() })
      .eq("share_slug", slug)
      .is("email", null)
      .select("share_slug, score, category_scores")
      .maybeSingle();

    if (error) {
      console.error("money-score unlock error", error);
      return NextResponse.json({ error: "Failed to save email" }, { status: 500 });
    }

    // No row matched: either this slug was already unlocked, or it does not
    // exist. Both are answered identically and successfully -- the user has
    // their score either way, and distinguishing them would let an attacker
    // probe for valid slugs. Critically, no second email goes out.
    if (!data) {
      return NextResponse.json({ ok: true });
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
