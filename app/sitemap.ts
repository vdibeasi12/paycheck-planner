import type { MetadataRoute } from "next"
import { getAllPosts } from "@/lib/blog"
import { CALCULATORS } from "@/lib/calculators"
import { UNIVERSITY_COURSES } from "@/lib/university"

// Only genuinely public, indexable marketing pages belong here. Anything
// behind auth (see middleware.ts's PROTECTED list) or purely functional
// (auth flows, diagnostics) is deliberately left out -- a sitemap should
// point crawlers at content worth ranking, not just "everything reachable."
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://paycheckplanner.ai"
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/features`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/money-score`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/calculators`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/challenge`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/worksheet`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/university`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/support`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/disclaimer`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ]

  // Every blog post is picked up automatically -- add a post to lib/blog.ts
  // and it appears here on the next build, no manual sitemap edit needed.
  const blogPages: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }))

  // Same pattern for the free calculators -- add one to lib/calculators.ts
  // and it's indexable here automatically.
  const calculatorPages: MetadataRoute.Sitemap = CALCULATORS.map((calc) => ({
    url: `${base}/calculators/${calc.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }))

  // University course pages, plus one entry per lesson for launched courses
  // (comingSoon courses have no lessons yet). Add a course/lesson to
  // lib/university.ts and it's indexable here automatically.
  const universityCoursePages: MetadataRoute.Sitemap = UNIVERSITY_COURSES.map((course) => ({
    url: `${base}/university/${course.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: course.comingSoon ? 0.4 : 0.6,
  }))

  const universityLessonPages: MetadataRoute.Sitemap = UNIVERSITY_COURSES.flatMap((course) =>
    course.lessons.map((lesson) => ({
      url: `${base}/university/${course.slug}/${lesson.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }))
  )

  return [
    ...staticPages,
    ...blogPages,
    ...calculatorPages,
    ...universityCoursePages,
    ...universityLessonPages,
  ]
}
