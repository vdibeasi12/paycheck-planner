"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Circle, ArrowRight } from "lucide-react"
import { lessonKey, type UniversityCourse } from "@/lib/university"

export default function CourseLessonList({ course }: { course: UniversityCourse }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    fetch("/api/university/progress")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return
        setCompleted(new Set(Array.isArray(data?.completed) ? data.completed : []))
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  const doneCount = course.lessons.filter((l) => completed.has(lessonKey(course.slug, l.slug))).length

  return (
    <div>
      {loaded && (
        <div className="mb-6 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${course.lessons.length ? (doneCount / course.lessons.length) * 100 : 0}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-medium text-gray-400">
            {doneCount}/{course.lessons.length} complete
          </span>
        </div>
      )}

      <div className="space-y-2">
        {course.lessons.map((lesson, i) => {
          const key = lessonKey(course.slug, lesson.slug)
          const done = completed.has(key)
          return (
            <Link
              key={lesson.slug}
              href={`/university/${course.slug}/${lesson.slug}`}
              className="flex items-center gap-3 rounded-xl border border-gray-800 bg-[#0f172a] p-4 transition hover:border-gray-700"
            >
              {done ? (
                <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
              ) : (
                <Circle size={20} className="shrink-0 text-gray-600" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  {i + 1}. {lesson.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-gray-400">{lesson.summary}</p>
              </div>
              <ArrowRight size={16} className="shrink-0 text-gray-600" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
