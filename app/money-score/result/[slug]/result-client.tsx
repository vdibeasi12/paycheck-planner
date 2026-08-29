"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { CATEGORY_LABELS, CATEGORY_TIPS, type MoneyScoreCategory } from "@/lib/money-score";

interface Props {
  slug: string;
  score: number;
  band: { key: string; label: string; color: string };
  categoryScores: Record<MoneyScoreCategory, { earned: number; max: number; percent: number }>;
  hasEmail: boolean;
}

export default function MoneyScoreResultClient({
  slug,
  score,
  band,
  categoryScores,
  hasEmail,
}: Props) {
  const [email, setEmail] = useState("");
  const [unlocked, setUnlocked] = useState(hasEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const firedConfetti = useRef(false);

  const entries = Object.entries(categoryScores) as [
    MoneyScoreCategory,
    { earned: number; max: number; percent: number }
  ][];
  const byPercentDesc = [...entries].sort((a, b) => b[1].percent - a[1].percent);
  const byPercentAsc = [...entries].sort((a, b) => a[1].percent - b[1].percent);
  const strongest = byPercentDesc[0];
  const showStrongest = strongest && strongest[1].percent >= 70;
  const needsWork = byPercentAsc.filter(([, v]) => v.percent < 70);
  const weakestTwo = needsWork.slice(0, 2);
  // Same "3 weakest categories" selection the plan email uses
  // (lib/money-score-email.ts) so the free preview below, the locked
  // teaser, and the emailed plan are always talking about the same 3
  // things -- whatever someone sees on this page before unlocking is a true
  // preview of what unlocking actually gives them, not a generic promise.
  const topThree = byPercentAsc.slice(0, 3);

  const isExcellent = band.key === "excellent";
  const isLow = band.key === "needsImprovement" || band.key === "atRisk";

  useEffect(() => {
    if (!isExcellent || firedConfetti.current) return;
    firedConfetti.current = true;
    const colors = ["#059669", "#34d399", "#a7f3d0"];
    confetti({ particleCount: 90, spread: 100, origin: { y: 0.6 }, colors });
    const t1 = setTimeout(
      () =>
        confetti({ particleCount: 50, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors }),
      200
    );
    const t2 = setTimeout(
      () =>
        confetti({ particleCount: 50, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors }),
      200
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isExcellent]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const tweetText = encodeURIComponent(
    `I scored ${score}/100 on the Paycheck Planner Money Quiz. What's yours?`
  );

  async function handleUnlock(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/money-score/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong");
      setUnlocked(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const headline = isExcellent
    ? "You're Crushing It! 🎉"
    : isLow
      ? "Let's Turn This Around"
      : "You're Making Progress";

  const subhead = isExcellent
    ? "Your money habits are paying off -- literally. Keep it up."
    : isLow
      ? "Every financial journey starts somewhere. Here's exactly where to focus first."
      : needsWork.length > 0
        ? `You're making progress, but there ${needsWork.length === 1 ? "is" : "are"} ${needsWork.length} area${
            needsWork.length === 1 ? "" : "s"
          } holding you back.`
        : "You're making solid progress across the board.";

  return (
    <div className="min-h-screen bg-[#020617] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-[#0f172a] border border-gray-800 rounded-2xl shadow-2xl shadow-black/40 p-8 text-center">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Your Quiz Score
          </p>
          <div
            className="mx-auto mb-4 flex h-40 w-40 items-center justify-center rounded-full border-8"
            style={{ borderColor: band.color }}
          >
            <span className="text-5xl font-bold text-white">{score}</span>
          </div>
          <h1 className="text-xl font-bold mb-1" style={{ color: band.color }}>
            {headline}
          </h1>
          <p className="text-gray-400 mb-6">{subhead}</p>

          {(showStrongest || weakestTwo.length > 0) && (
            <div className="space-y-2 text-left mb-6 max-w-md mx-auto">
              {showStrongest && (
                <p className="text-sm text-gray-300">
                  {"✅"} Strong {CATEGORY_LABELS[strongest[0]]}
                </p>
              )}
              {weakestTwo.map(([key]) => (
                <p key={key} className="text-sm text-gray-300">
                  {"⚠️"} {CATEGORY_LABELS[key]} needs improvement
                </p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-8">
            {entries.map(([key, val]) => (
              <div key={key} className="rounded-lg border border-gray-800 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-300">
                    {CATEGORY_LABELS[key]}
                  </span>
                  <span className="text-sm font-semibold text-white">{val.percent}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${val.percent}%` }} />
                </div>
              </div>
            ))}
          </div>

          {isLow && (
            <div className="mb-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-left">
              <p className="font-semibold text-white mb-1">Not sure where to start?</p>
              <p className="text-sm text-gray-300 mb-3">
                Paycheck Planner University has free, step-by-step lessons on exactly the basics
                that move a score like this -- budgeting, debt, and building your first safety
                net.
              </p>
              <Link
                href="/university"
                className="inline-block px-4 py-2 rounded-lg bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400"
              >
                Explore Paycheck Planner University
              </Link>
            </div>
          )}

          {/* Worksheet cross-promo (Aug 29 2026): the lead-magnet worksheet
              previously only linked from the footer and a blog post, both
              low-intent placements -- this page is people actively worried
              about their money mid-quiz-result, the closest thing the site
              has to a matched audience for it. Tagged through /go so the
              click attributes the same way an external share link would,
              instead of vanishing as an untagged internal nav click. Shown
              to every visitor regardless of score/unlock state. */}
          <div className="mb-8 rounded-xl border border-gray-800 bg-[#0f172a] p-5 text-left">
            <p className="font-semibold text-white mb-1">
              {"📄"} Free paycheck budget worksheet
            </p>
            <p className="text-sm text-gray-300 mb-3">
              A printable worksheet that matches every bill to the exact paycheck that covers it
              -- the fastest fix for running out of money before payday.
            </p>
            <a
              href="/go/money-score-worksheet?to=/worksheet"
              className="inline-block px-4 py-2 rounded-lg border border-gray-700 text-gray-200 text-sm font-semibold hover:bg-white/5"
            >
              Get the free worksheet
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <button
              onClick={copyLink}
              className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm font-medium hover:bg-white/5"
            >
              {copied ? "Link copied!" : "Copy share link"}
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm font-medium hover:bg-white/5"
            >
              Share on X
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm font-medium hover:bg-white/5"
            >
              Share on Facebook
            </a>
            {/* Platforms like Instagram Stories/TikTok don't unfurl link
                previews at all -- a downloadable score card is the only way
                to actually share the result there. */}
            <a
              href={`/api/money-score/share-image/${slug}`}
              download={`money-quiz-score-${score}.png`}
              className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 text-sm font-medium hover:bg-white/5"
            >
              Download image
            </a>
          </div>

          <div className="border-t border-gray-800 pt-8">
            {!unlocked ? (
              <>
                <h2 className="text-lg font-bold text-white mb-1">
                  Your Personalized 3-Step Plan
                </h2>
                <p className="text-gray-400 mb-4 text-sm">
                  Based on your answers, here's exactly what will move your score the most.
                </p>

                {/* Concrete preview, not a blind ask: the #1 fix is shown in
                    full (real content from the same tip bank the plan email
                    uses), the other two are visibly blurred/locked. Old copy
                    asked for an email in exchange for an abstract "personalized
                    plan" with nothing to show for it -- and the category
                    breakdown above already gave away every percentage for
                    free, so there was no curiosity gap left to unlock. This
                    gives something real up front and makes clear there's
                    more behind the email. */}
                <div className="mb-6 max-w-md mx-auto space-y-3 text-left">
                  {topThree.map(([key, val], i) => {
                    const isFirst = i === 0;
                    return (
                      <div
                        key={key}
                        className={`rounded-lg border p-4 ${
                          isFirst
                            ? "border-emerald-500/30 bg-emerald-500/10"
                            : "border-gray-800 bg-[#0b1220]"
                        }`}
                      >
                        <p className="text-sm font-semibold text-white mb-1">
                          {isFirst ? "👉 Start here: " : `${i + 1}. `}
                          {CATEGORY_LABELS[key]} -- {val.percent}%
                        </p>
                        {isFirst ? (
                          <p className="text-sm text-gray-300">{CATEGORY_TIPS[key]}</p>
                        ) : (
                          <p
                            className="text-sm text-gray-500 blur-[3px] select-none"
                            aria-hidden="true"
                          >
                            {CATEGORY_TIPS[key]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-gray-400 mb-4 text-sm">
                  Enter your email to unlock {topThree.length > 1 ? "steps 2-" + topThree.length : "the rest"} and
                  get all {topThree.length} sent to your inbox.
                </p>
                <form
                  onSubmit={handleUnlock}
                  className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-700 bg-[#020617] text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-3 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {submitting ? "Sending…" : "Unlock My Plan"}
                  </button>
                </form>
                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white mb-1">
                  {"Your plan is on the way 🎉"}
                </h2>
                <p className="text-gray-400 mb-4 text-sm">
                  It's also in your inbox now -- here's your full plan:
                </p>
                <div className="mb-6 max-w-md mx-auto space-y-3 text-left">
                  {topThree.map(([key, val], i) => (
                    <div key={key} className="rounded-lg border border-gray-800 bg-[#0b1220] p-4">
                      <p className="text-sm font-semibold text-white mb-1">
                        {i + 1}. {CATEGORY_LABELS[key]} -- {val.percent}%
                      </p>
                      <p className="text-sm text-gray-300">{CATEGORY_TIPS[key]}</p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/signup"
                  className="inline-block px-6 py-3 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
                >
                  Start Free with Paycheck Planner
                </Link>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/money-score" className="hover:underline hover:text-gray-300">
            Retake the quiz
          </Link>
        </p>
      </div>
    </div>
  );
}
