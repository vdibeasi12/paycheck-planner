"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MONEY_SCORE_QUESTIONS } from "@/lib/money-score";

export default function MoneyScorePage() {
  const router = useRouter();
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = step >= 0 ? MONEY_SCORE_QUESTIONS[step] : null;
  const progress =
    step >= 0 ? Math.round((step / MONEY_SCORE_QUESTIONS.length) * 100) : 0;
  const isLast = step === MONEY_SCORE_QUESTIONS.length - 1;

  function start() {
    setStep(0);
  }

  function selectOption(optionIndex: number) {
    if (!question) return;
    const nextAnswers = { ...answers, [question.id]: optionIndex };
    setAnswers(nextAnswers);
    if (isLast) {
      submit(nextAnswers);
    } else {
      setStep((s) => s + 1);
    }
  }

  async function submit(finalAnswers: Record<string, number>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/money-score/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong");
      router.push(`/money-score/result/${data.slug}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8">
        {step === -1 && (
          <div className="text-center py-8">
            <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-3">
              Free 2-Minute Quiz
            </p>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {`What's Your Money Score?`}
            </h1>
            <p className="text-gray-600 mb-8">
              {`Answer ${MONEY_SCORE_QUESTIONS.length} quick questions about your budgeting, savings, debt, and spending. Get an instant score out of 100 and see exactly where to focus first.`}
            </p>
            <button
              onClick={start}
              className="px-8 py-4 rounded-xl bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-700"
            >
              Start the Quiz
            </button>
          </div>
        )}

        {step >= 0 && !submitting && question && (
          <>
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">
                  {`Question ${step + 1} of ${MONEY_SCORE_QUESTIONS.length}`}
                </span>
                <span className="text-sm font-medium text-emerald-600">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">{question.prompt}</h2>
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={option.label}
                  onClick={() => selectOption(index)}
                  className="w-full text-left px-5 py-4 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-colors font-medium text-gray-800"
                >
                  {option.label}
                </button>
              ))}
            </div>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            {step > 0 && (
              <button
                onClick={goBack}
                className="mt-6 text-sm text-gray-500 hover:text-gray-700"
              >
                {`\u2190 Back`}
              </button>
            )}
          </>
        )}

        {submitting && (
          <div className="py-16 text-center">
            <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600 font-medium">
              {"Calculating your Money Score\u2026"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}