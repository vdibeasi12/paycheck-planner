import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import LessonComplete from "./lesson-client"
import { getCourse, getLesson, getRelatedCalculatorSlug, UNIVERSITY_COURSES } from "@/lib/university"
import { getCalculatorMeta } from "@/lib/calculators"

export function generateStaticParams() {
  return UNIVERSITY_COURSES.flatMap((c) => c.lessons.map((l) => ({ course: c.slug, lesson: l.slug })))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>
}): Promise<Metadata> {
  const { course: courseSlug, lesson: lessonSlug } = await params
  const found = getLesson(courseSlug, lessonSlug)
  if (!found) return {}
  return {
    title: `${found.lesson.title} -- Paycheck Planner University`,
    description: found.lesson.summary,
    alternates: {
      canonical: `/university/${courseSlug}/${lessonSlug}`,
    },
  }
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>
}) {
  const { course: courseSlug, lesson: lessonSlug } = await params
  const found = getLesson(courseSlug, lessonSlug)
  if (!found) notFound()
  const { course, lesson } = found

  const idx = course.lessons.findIndex((l) => l.slug === lesson.slug)
  const prev = idx > 0 ? course.lessons[idx - 1] : undefined
  const next = idx < course.lessons.length - 1 ? course.lessons[idx + 1] : undefined

  const relatedCalcSlug = getRelatedCalculatorSlug(course.slug, lesson.slug)
  const relatedCalc = relatedCalcSlug ? getCalculatorMeta(relatedCalcSlug) : undefined

  return (
    <div className="min-h-screen bg-[#020617] py-12 text-white">
      <div className="mx-auto max-w-2xl px-6">
        <Link
          href={`/university/${course.slug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-white"
        >
          <ArrowLeft size={16} /> {course.title}
        </Link>

        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-400">
          Lesson {idx + 1} of {course.lessons.length}
        </p>
        <h1 className="mb-4 text-3xl font-bold">{lesson.title}</h1>
        <p className="mb-8 whitespace-pre-line leading-relaxed text-gray-300">{lesson.content}</p>

        <LessonComplete courseSlug={course.slug} lessonSlug={lesson.slug} />

        {relatedCalc && (
          <Link
            href={`/calculators/${relatedCalc.slug}`}
            className="mt-6 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 transition hover:border-emerald-400"
          >
            <div>
              <p className="text-sm font-semibold text-white">Try it: {relatedCalc.title}</p>
              <p className="mt-0.5 text-xs text-gray-400">{relatedCalc.description}</p>
            </div>
            <span className="shrink-0 text-emerald-400">&rarr;</span>
          </Link>
        )}

        <div className="mt-10 flex items-center justify-between border-t border-gray-800 pt-6 text-sm">
          {prev ? (
            <Link href={`/university/${course.slug}/${prev.slug}`} className="text-gray-400 hover:text-white">
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/university/${course.slug}/${next.slug}`} className="text-emerald-400 hover:text-emerald-300">
              {next.title} →
            </Link>
          ) : (
            <Link href={`/university/${course.slug}`} className="text-emerald-400 hover:text-emerald-300">
              Back to course →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
