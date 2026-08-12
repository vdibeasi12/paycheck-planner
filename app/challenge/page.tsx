import type { Metadata } from "next"
import ChallengeSignupForm from "@/app/components/ChallengeSignupForm"
import { CHALLENGE_DAYS } from "@/lib/challenge-days"

export const metadata: Metadata = {
  title: "The 30-Day Paycheck Planner Challenge",
  description:
    "One short task a day for 30 days -- know where your money goes, build a paycheck budget, pay down debt, and start saving. Free, by email.",
  alternates: {
    canonical: "/challenge",
  },
}

const PHASES = [
  "Foundation",
  "Paycheck Mechanics",
  "Debt",
  "Saving",
  "Trim & Automate",
  "Review & Plan Forward",
]

export default function ChallengePage() {
  return (
    <div className="min-h-screen bg-[#020617] py-12 text-white">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="mb-3 text-4xl font-bold">The 30-Day Paycheck Planner Challenge</h1>
        <p className="mb-8 text-gray-400">
          One short task a day. No spreadsheet required to start -- just 30 small, specific steps
          that add up to a real financial plan.
        </p>

        <div className="mb-10">
          <ChallengeSignupForm />
        </div>

        <div className="space-y-8">
          {PHASES.map((phase) => (
            <div key={phase}>
              <h2 className="mb-3 text-lg font-semibold text-emerald-400">{phase}</h2>
              <div className="space-y-2">
                {CHALLENGE_DAYS.filter((d) => d.phase === phase).map((d) => (
                  <div
                    key={d.day}
                    className="flex items-start gap-3 rounded-xl border border-gray-800 bg-[#0f172a] p-4"
                  >
                    <span className="mt-0.5 shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                      Day {d.day}
                    </span>
                    <div>
                      <p className="font-medium text-white">{d.title}</p>
                      <p className="text-sm text-gray-400">{d.task}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <ChallengeSignupForm />
        </div>
      </div>
    </div>
  )
}
