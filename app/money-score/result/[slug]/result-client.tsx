"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CATEGORY_LABELS, type MoneyScoreCategory } from "@/lib/money-score";

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

  const entries = Object.entries(categoryScores) as [
    MoneyScoreCategory,
    { earned: number; max: number; percent: number }
  ][];
  const sorted = [...entries].sort((a, b) => b[1].percent - a[1].percent);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const tweetText = encodeURIComponent(
    `I just took the Paycheck Planner Money Score quiz and scored ${score}/100. See how you compare:`
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Your Money Score
          </p>
          <div
            className="mx-auto mb-4 flex h-40 w-40 items-center justify-center rounded-full border-8"
            style={{ borderColor: band.color }}
          >
            <span className="text-5xl font-bold text-gray-900">{score}</span>
          </div>
          <h1 className="text-xl font-bold mb-1" style={{ color: band.color }}>
            {band.label}
          </h1>
          <p className="text-gray-600 mb-6">
            {`You're doing well with ${CATEGORY_LABELS[strongest[0]]}, but your ${CATEGORY_LABELS[weakest[0]]} could use improvement.`}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-8">
            {entries.map(([key, val]) => (
              <div key={key} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {CATEGORY_LABELS[key]}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{val.percent}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${val.percent}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <button
              onClick={copyLink}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
            >
              {copied ? "Link copied!" : "Copy share link"}
            </button>
            
              href={`https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
            >
              Share on X
            </a>
            
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
            >
              Share on Facebook
            </a>
          </div>

          <div className="border-t border-gray-100 pt-8">
            {!unlocked ? (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                  Want to improve your score?
                </h2>
                <p className="text-gray-600 mb-4">
                  Get your free personalized plan to raise your Money Score, straight to your inbox.
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
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {submitting ? "Sending\u2026" : "Get My Plan"}
                  </button>
                </form>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                  {"Your plan is on the way \uD83C\uDF89"}
                </h2>
                <p className="text-gray-600 mb-4">
                  Paycheck Planner can help you build a real plan to improve every category above.
                </p>
                <Link
                  href="/signup"
                  className="inline-block px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  Start Free with Paycheck Planner
                </Link>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          <Link href="/money-score" className="hover:underline">
            Retake the quiz
          </Link>
        </p>
      </div>
    </div>
  );
}