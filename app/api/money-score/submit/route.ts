import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { calculateMoneyScore, generateShareSlug } from "@/lib/money-score";
import { track } from "@/lib/track";

// Same first-touch attribution the rest of the site captures into the
// pp_attr cookie (see app/components/AttributionCapture.tsx) -- read here
// server-side so a completed quiz can be attributed to a channel (YouTube,
// a comparison-page visit, direct, etc.) without the client having to send
// anything itself. pp_vid is the long-lived anonymous visitor id from
// lib/trackClient.ts, stored alongside so this row can still be joined back
// to that visitor's other events later if needed.
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
    // Malformed/missing cookie -- attribution is a nice-to-have, never block the quiz on it.
  }
  const visitorId = cookieHeader.get("pp_vid")?.value?.slice(0, 100) ?? null;
  return { source, medium, campaign, visitorId };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const answers = body?.answers;

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Missing answers" }, { status: 400 });
    }

    const { score, categoryScores } = calculateMoneyScore(answers);
    const supabase = await createClient();
    const cookieStore = await cookies();
    const { source, medium, campaign, visitorId } = readAttribution(cookieStore);

    let slug = generateShareSlug();
    let attempts = 0;
    let inserted = false;
    let lastError: any = null;

    while (!inserted && attempts < 3) {
      const { error } = await supabase.from("money_score_results").insert({
        share_slug: slug,
        score,
        category_scores: categoryScores,
        answers,
        source,
        medium,
        campaign,
        visitor_id: visitorId,
      });

      if (!error) {
        inserted = true;
      } else if (error.code === "23505") {
        slug = generateShareSlug();
        attempts += 1;
        lastError = error;
      } else {
        lastError = error;
        break;
      }
    }

    if (!inserted) {
      console.error("money-score submit error", lastError);
      return NextResponse.json({ error: "Failed to save result" }, { status: 500 });
    }

    // Best-effort: attach the user if they happen to be logged in. The quiz
    // itself is anonymous by design, so this is usually null.
    const { data: userData } = await supabase.auth.getUser();
    await track("money_score_completed", {
      userId: userData?.user?.id ?? null,
      metadata: { score, slug, source, medium, campaign, visitorId },
    });

    return NextResponse.json({ slug });
  } catch (err) {
    console.error("money-score submit exception", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}