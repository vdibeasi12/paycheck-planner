import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateMoneyScore, generateShareSlug } from "@/lib/money-score";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const answers = body?.answers;

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Missing answers" }, { status: 400 });
    }

    const { score, categoryScores } = calculateMoneyScore(answers);
    const supabase = await createClient();

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

    return NextResponse.json({ slug });
  } catch (err) {
    console.error("money-score submit exception", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}