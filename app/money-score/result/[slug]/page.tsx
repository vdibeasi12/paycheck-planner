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
    .select("share_slug, score, category_scores, has_email")
    .eq("share_slug", slug)
    .single();

  if (error || !data) {
    notFound();
  }

  const band = getScoreBand(data.score);
  type CategoryScores = Record<MoneyScoreCategory, { earned: number; max: number; percent: number }>;
  const categoryScores = data.category_scores as CategoryScores;

  return (
    <MoneyScoreResultClient
      slug={data.share_slug}
      score={data.score}
      band={band}
      categoryScores={categoryScores}
      hasEmail={Boolean(data.has_email)}
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
    score !== null ? `My Money Quiz score is ${score}/100` : "The Money Quiz";
  const description =
    score !== null
      ? "I just took the Money Quiz. Take the free 2-minute quiz and find out your score."
      : "Take the free 2-minute quiz and find out your Money Quiz score.";
  // Dynamic per-score card (app/api/money-score/share-image/[slug]/route.tsx)
  // -- this is what makes the link actually worth sharing: a plain-text
  // preview gets scrolled past, a big colored "82/100" card gets a reaction.
  const imageUrl = `https://paycheckplanner.ai/api/money-score/share-image/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/money-score/result/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://paycheckplanner.ai/money-score/result/${slug}`,
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
