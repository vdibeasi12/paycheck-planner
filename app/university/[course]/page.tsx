import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Lock } from "lucide-react"
import CourseLessonList from "./course-client"
import { createClient } from "@/lib/supabase/server"
import { getAllCourses, getCourse, isCourseUnlocked, UNIVERSITY_COURSES } from "@/lib/university"

export function generateStaticParams() {
  return getAllCourses().map((c) => ({ course: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string }>
}): Promise<Metadata> {
  const { course: courseSlug } = await params
  const course = getCourse(courseSlug)
  if (!course) return {}
  return {
    title: `${course.title} -- Paycheck Planner University`,
    description: course.seoDescription,
    alternates: {
      canonical: `/university/${course.slug}`,
    },
  }
}

export default async function CoursePage({
  params,
}: {
  params: Promise<{ course: string }>
}) {
  const { course: courseSlug } = await params
  const course = getCourse(courseSlug)
  if (!course) notFound()

  // Courses unlock in order (see lib/university.ts) -- fetch the signed-in
  // user's progress the same way the catalog page does, so someone can't
  // just type the URL of a course they haven't unlocked yet and skip ahead.
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

  const unlocked = isCourseUnlocked(course.slug, completedKeys)
  const courseIndex = UNIVERSITY_COURSES.findIndex((c) => c.slug === course.slug)
  const prevCourse = courseIndex > 0 ? UNIVERSITY_COURSES[courseIndex - 1] : undefined

  return (
    <div className="min-h-screen bg-[#020617] py-12 text-white">
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href="/university"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-white"
        >
          <ArrowLeft size={16} /> All courses
        </Link>

        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          {unlocked ? "Course" : "Locked"}
        </p>
        <h1 className="mb-3 text-4xl font-bold">{course.title}</h1>
        <p className="mb-10 text-gray-400">{course.description}</p>

        {!unlocked ? (
          <>
            <div className="rounded-2xl border border-gray-800 bg-[#0f172a] p-6">
              <div className="mb-3 flex items-center gap-2 text-gray-300">
                <Lock size={18} />
                <p className="font-semibold">
                  {user
                    ? `Complete ${prevCourse?.shortTitle ?? "the previous course"} first`
                    : "Sign in to track progress and unlock this course"}
                </p>
              </div>
              <p className="mb-4 text-sm text-gray-400">
                {user
                  ? `Courses unlock in order -- finish every lesson in ${prevCourse?.title ?? "the previous course"} and this one opens up automatically.`
                  : "Courses unlock as you complete them, starting with Budgeting. Sign in (or start Budgeting free) to begin."}
              </p>
              {prevCourse && (
                <Link
                  href={`/university/${prevCourse.slug}`}
                  className="text-sm font-semibold text-emerald-400 hover:underline"
                >
                  Go to {prevCourse.title} →
                </Link>
              )}
            </div>

            {/* Lesson content itself is public/indexable even when the course is
                locked for progress-tracking -- only the "mark complete" state
                requires an account. Keep these links rendered (not hidden behind
                the lock) so the lessons stay reachable from site navigation. */}
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-gray-300">Lessons in this course</p>
              <div className="space-y-2">
                {course.lessons.map((lesson, i) => (
                  <Link
                    key={lesson.slug}
                    href={`/university/${course.slug}/${lesson.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-gray-800 bg-[#0f172a] p-4 transition hover:border-gray-700"
                  >
                    <Lock size={16} className="shrink-0 text-gray-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">
                        {i + 1}. {lesson.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-400">{lesson.summary}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        ) : (
          <CourseLessonList course={course} />
        )}
      </div>
    </div>
  )
}
