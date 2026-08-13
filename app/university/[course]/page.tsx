import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import UniversitySignupForm from "@/app/components/UniversitySignupForm"
import CourseLessonList from "./course-client"
import { getAllCourses, getCourse } from "@/lib/university"

export function generateStaticParams() {
  return getAllCourses().map((c) => ({ course: c.slug }))
}

export function generateMetadata({ params }: { params: { course: string } }): Metadata {
  const course = getCourse(params.course)
  if (!course) return {}
  return {
    title: `${course.title} -- Paycheck Planner University`,
    description: course.seoDescription,
    alternates: {
      canonical: `/university/${course.slug}`,
    },
  }
}

export default function CoursePage({ params }: { params: { course: string } }) {
  const course = getCourse(params.course)
  if (!course) notFound()

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
          {course.comingSoon ? "Coming Soon" : "Course"}
        </p>
        <h1 className="mb-3 text-4xl font-bold">{course.title}</h1>
        <p className="mb-10 text-gray-400">{course.description}</p>

        {course.comingSoon || course.lessons.length === 0 ? (
          <UniversitySignupForm source={`university-course-${course.slug}`} />
        ) : (
          <CourseLessonList course={course} />
        )}
      </div>
    </div>
  )
}
