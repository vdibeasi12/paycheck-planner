import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getScoreBand, type MoneyScoreCategory } from "@/lib/money-score";
import MoneyScoreResultClient from "./result-client";

export default async function MoneyScoreResultPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("money_score_results")
    .select("share_slug, score, category_scores, email")
    .eq("share_slug", slug)
    .single();

  if (error || !data) {
    notFound();
  }

  const band = getScoreBand(data.score);
  const categoryScores = data.category_scores as Record
    MoneyScoreCategory,
    { earned: number; max: number; percent: number }
  >;

  return (
    <MoneyScoreResultClient
      slug={data.share_slug}
      score={data.score}
      band={band}
      categoryScores={categoryScores}
      hasEmail={Boolean(data.email)}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("money_score_results")
    .select("score")
    .eq("share_slug", slug)
    .single();

  const score = data?.score ?? null;
  const title =
    score !== null ? `My Money Score is ${score}/100` : "What's Your Money Score?";
  const description =
    score !== null
      ? "I just found out my Money Score. Take the free 2-minute quiz and find out yours."
      : "Take the free 2-minute quiz and find out your Money Score.";

  return {
    title,
    description,
    openGraph: { title, description },
  };
}