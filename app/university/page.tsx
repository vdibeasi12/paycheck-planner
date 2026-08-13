import type { Metadata } from "next"
import Link from "next/link"
import { Wallet, Banknote, TrendingDown, PiggyBank, CreditCard, Sparkles, Lock, ArrowRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import UniversitySignupForm from "@/app/components/UniversitySignupForm"
import { createClient } from "@/lib/supabase/server"
import { getAllCourses, getUnlockedMap } from "@/lib/university"

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

export default async function UniversityPage() {
  const courses = getAllCourses()

  // Courses unlock in order: everyone can start Budgeting; each course after
  // that unlocks once every lesson in the course before it is marked
  // complete. Anonymous visitors (or anyone not signed in) get an empty
  // completed set, so only the first course shows as available to them --
  // lesson content itself stays public/indexable once a course *is* open,
  // only the unlock check requires an account.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let completedKeys = new Set<string>()
  if (user) {
    const { data } = await supabase
      .from("university_progress")
      .select("lesson_key")
      .eq("user_id", user.id)
    completedKeys = new Set((data || []).map((r: any) => r.lesson_key as string))
  }

  const unlockedMap = getUnlockedMap(completedKeys)

  return (
    <div className="min-h-screen bg-[#020617] py-12 text-white">
      <div className="mx-auto max-w-3xl px-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          Paycheck Planner University
        </p>
        <h1 className="mb-3 text-4xl font-bold">Free courses on real financial habits</h1>
        <p className="mb-10 text-gray-400">
          Short, practical lessons -- no jargon, no fluff. Courses unlock in order: finish one to
          open the next, starting with Budgeting.
        </p>

        <div className="mb-10 space-y-3">
          {courses.map((course, i) => {
            const Icon = ICONS[course.icon] || Wallet
            const unlocked = unlockedMap[i]
            const prevCourse = i > 0 ? courses[i - 1] : undefined

            let badge: React.ReactNode
            if (unlocked) {
              badge = (
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                  {course.lessons.length} lessons
                </span>
              )
            } else if (!user) {
              badge = (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-400">
                  <Lock size={11} /> Sign in to unlock
                </span>
              )
            } else {
              badge = (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-800 px-2 py-0.5 text-xs font-semibold text-gray-400">
                  <Lock size={11} /> Complete {prevCourse?.shortTitle} first
                </span>
              )
            }

            const cardBody = (
              <div
                className={`flex items-start gap-4 rounded-2xl border p-5 transition ${
                  unlocked
                    ? "border-emerald-500/30 bg-[#0f172a] hover:border-emerald-400"
                    : "border-gray-800 bg-[#0f172a]"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    unlocked ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-800 text-gray-500"
                  }`}
                >
                  <Icon size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-white">{course.title}</h2>
                    {badge}
                  </div>
                  <p className="text-sm text-gray-400">{course.description}</p>
                </div>
                {unlocked && <ArrowRight size={18} className="mt-1 shrink-0 text-gray-500" />}
              </div>
            )

            return unlocked ? (
              <Link key={course.slug} href={`/university/${course.slug}`}>
                {cardBody}
              </Link>
            ) : (
              <div key={course.slug}>{cardBody}</div>
            )
          })}
        </div>

        <UniversitySignupForm source="university-page" />
      </div>
    </div>
  )
}
