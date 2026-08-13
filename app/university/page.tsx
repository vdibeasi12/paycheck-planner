import type { Metadata } from "next"
import UniversitySignupForm from "@/app/components/UniversitySignupForm"

export const metadata: Metadata = {
  title: "Paycheck Planner University",
  description:
    "Free, practical courses on budgeting, debt payoff, and building real financial habits -- coming soon from Paycheck Planner.",
  alternates: {
    canonical: "/university",
  },
}

const TOPICS = [
  "Building a paycheck-based budget that actually holds up",
  "Paying off debt with a real plan, not just minimum payments",
  "Building an emergency fund without derailing everything else",
  "Turning vague money goals into ones you actually hit",
]

export default function UniversityPage() {
  return (
    <div className="min-h-screen bg-[#020617] py-12 text-white">
      <div className="mx-auto max-w-3xl px-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          Coming Soon
        </p>
        <h1 className="mb-3 text-4xl font-bold">Paycheck Planner University</h1>
        <p className="mb-8 text-gray-400">
          Free courses that walk you through the fundamentals -- step by step, no jargon, no
          fluff. Built for anyone who wants a real plan for their money, not just another app.
        </p>

        <div className="mb-10">
          <UniversitySignupForm source="university-page" />
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">{"What's coming"}</h2>
          {TOPICS.map((topic) => (
            <div
              key={topic}
              className="flex items-start gap-3 rounded-xl border border-gray-800 bg-[#0f172a] p-4"
            >
              <span className="mt-0.5 shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                Soon
              </span>
              <p className="text-sm text-gray-300">{topic}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
