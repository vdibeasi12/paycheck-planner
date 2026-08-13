import type { Metadata } from "next"
import Link from "next/link"
import { Wallet, Banknote, TrendingDown, PiggyBank, CreditCard, Sparkles, Lock, ArrowRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import UniversitySignupForm from "@/app/components/UniversitySignupForm"
import { getAllCourses } from "@/lib/university"

export const metadata: Metadata = {
  title: "Paycheck Planner University",
  description:
    "Free, practical courses on budgeting, paychecks, debt payoff, saving, credit, and financial freedom -- from Paycheck Planner.",
  alternates: {
    canonical: "/university",
  },
}

const ICONS: Record<string, LucideIcon> = {
  Wallet,
  Banknote,
  TrendingDown,
  PiggyBank,
  CreditCard,
  Sparkles,
}

export default function UniversityPage() {
  const courses = getAllCourses()

  return (
    <div className="min-h-screen bg-[#020617] py-12 text-white">
      <div className="mx-auto max-w-3xl px-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          Paycheck Planner University
        </p>
        <h1 className="mb-3 text-4xl font-bold">Free courses on real financial habits</h1>
        <p className="mb-10 text-gray-400">
          Short, practical lessons -- no jargon, no fluff. Built for anyone who wants a real plan
          for their money, not just another app. Start with Budgeting; the rest of the courses are
          on the way.
        </p>

        <div className="mb-10 space-y-3">
          {courses.map((course) => {
            const Icon = ICONS[course.icon] || Wallet
            const cardBody = (
              <div
                className={`flex items-start gap-4 rounded-2xl border p-5 transition ${
                  course.comingSoon
                    ? "border-gray-800 bg-[#0f172a]"
                    : "border-emerald-500/30 bg-[#0f172a] hover:border-emerald-400"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    course.comingSoon ? "bg-gray-800 text-gray-500" : "bg-emerald-500/15 text-emerald-400"
                  }`}
                >
                  <Icon size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h2 className="font-semibold text-white">{course.title}</h2>
                    {course.comingSoon ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-400">
                        <Lock size={11} /> Coming soon
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                        {course.lessons.length} lessons
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{course.description}</p>
                </div>
                {!course.comingSoon && (
                  <ArrowRight size={18} className="mt-1 shrink-0 text-gray-500" />
                )}
              </div>
            )

            return course.comingSoon ? (
              <div key={course.slug}>{cardBody}</div>
            ) : (
              <Link key={course.slug} href={`/university/${course.slug}`}>
                {cardBody}
              </Link>
            )
          })}
        </div>

        <UniversitySignupForm source="university-page" />
      </div>
    </div>
  )
}
