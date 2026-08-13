// lib/university.ts
// Paycheck Planner University course catalog. Mirrors the lib/blog.ts /
// lib/challenge-days.ts pattern: a typed content array + lookup helpers,
// consumed by app/university/**/page.tsx.
//
// Structure-first build: Course 1 (Budgeting) is "live" with real lesson
// slugs/routes and placeholder body copy so the full reading + progress
// flow can be tested end to end. Courses 2-6 are intentionally
// comingSoon: true with no lessons yet -- they exist here so the catalog,
// nav, and signup flow don't need to change shape when real content for
// them is written later. Category set mirrors lib/blog.ts's BlogCategory
// union on purpose, so a future post can link straight into the matching
// course.

export type UniversityLesson = {
  slug: string
  title: string
  summary: string
  // Placeholder body copy. Replace with real lesson content in a later
  // pass -- the route, layout, and progress tracking already work.
  content: string
}

export type UniversityCourse = {
  slug: string
  title: string
  shortTitle: string
  description: string
  seoDescription: string
  icon: string // lucide-react icon name, resolved in the UI layer
  comingSoon: boolean
  lessons: UniversityLesson[]
}

const PLACEHOLDER_NOTICE =
  "This lesson is a placeholder. The full write-up is still being written -- " +
  "for now, here's the shape of what it will cover so you can see how the " +
  "course fits together."

export const UNIVERSITY_COURSES: UniversityCourse[] = [
  {
    slug: "budgeting",
    title: "Budgeting",
    shortTitle: "Budgeting",
    description: "Build a paycheck-based budget that actually holds up month to month.",
    seoDescription:
      "Free course: build a paycheck-based budget that actually holds up -- needs vs. wants, mapping bills to paychecks, and adjusting when money is tight.",
    icon: "Wallet",
    comingSoon: false,
    lessons: [
      {
        slug: "why-paycheck-based-budgeting-works",
        title: "Why paycheck-based budgeting works",
        summary: "Budgeting by the month hides the real problem: which specific paycheck covers which bill.",
        content:
          PLACEHOLDER_NOTICE +
          "\n\nWhat this lesson will cover: why monthly budgets break down for anyone paid biweekly or twice a month, the difference between budgeting your salary and budgeting your take-home pay, and how a paycheck-based view exposes tight weeks before they become overdrafts.",
      },
      {
        slug: "needs-vs-wants-the-real-breakdown",
        title: "Needs vs. wants: the real breakdown",
        summary: "Sorting every expense into 'need' or 'want' is the first real decision point in a budget.",
        content:
          PLACEHOLDER_NOTICE +
          "\n\nWhat this lesson will cover: a practical test for sorting expenses (not just 'is it fun'), why the goal isn't eliminating wants, and common expenses people misclassify in both directions.",
      },
      {
        slug: "building-your-first-paycheck-budget",
        title: "Building your first paycheck budget",
        summary: "A budget for one paycheck is a project you can finish today.",
        content:
          PLACEHOLDER_NOTICE +
          "\n\nWhat this lesson will cover: a step-by-step walkthrough of building a single paycheck's budget using your bill list and take-home pay, plus a link to the 50/30/20 calculator to sanity-check the split.",
      },
      {
        slug: "mapping-bills-to-paychecks",
        title: "Mapping bills to paychecks",
        summary: "Assigning each bill to a specific paycheck is what turns a budget into something you can follow.",
        content:
          PLACEHOLDER_NOTICE +
          "\n\nWhat this lesson will cover: how to lay out a full month of paychecks against due dates, handling the 3-paycheck months that come with biweekly pay, and what to do when a bill doesn't line up cleanly.",
      },
      {
        slug: "adjusting-when-a-paycheck-falls-short",
        title: "Adjusting when a paycheck falls short",
        summary: "A real plan for the paychecks that don't cover everything, not just the ones that do.",
        content:
          PLACEHOLDER_NOTICE +
          "\n\nWhat this lesson will cover: a decision order for tight paychecks (what to move, what to trim, what never gets skipped), building a small buffer so a short paycheck stops being an emergency, and when to use a mini emergency fund instead of a credit card.",
      },
    ],
  },
  {
    slug: "paychecks",
    title: "Paychecks",
    shortTitle: "Paychecks",
    description: "Understand your actual take-home pay and put it on autopilot.",
    seoDescription:
      "Free course on understanding your paycheck -- take-home pay, deductions, and automating bills and savings around when you actually get paid.",
    icon: "Banknote",
    comingSoon: true,
    lessons: [],
  },
  {
    slug: "debt",
    title: "Debt Payoff",
    shortTitle: "Debt",
    description: "Pay off debt with a real plan, not just minimum payments.",
    seoDescription:
      "Free course on paying off debt -- snowball vs. avalanche, calculating your debt-free date, and finding extra money to pay down principal faster.",
    icon: "TrendingDown",
    comingSoon: true,
    lessons: [],
  },
  {
    slug: "saving",
    title: "Saving",
    shortTitle: "Saving",
    description: "Build an emergency fund and real savings habits without derailing everything else.",
    seoDescription:
      "Free course on saving money -- starting an emergency fund, automating transfers, and setting savings goals you'll actually hit.",
    icon: "PiggyBank",
    comingSoon: true,
    lessons: [],
  },
  {
    slug: "credit",
    title: "Credit",
    shortTitle: "Credit",
    description: "Understand how credit actually works and how to build it on purpose.",
    seoDescription:
      "Free course on credit -- how credit scores are calculated, using credit responsibly, and building credit history without carrying debt.",
    icon: "CreditCard",
    comingSoon: true,
    lessons: [],
  },
  {
    slug: "financial-freedom",
    title: "Financial Freedom",
    shortTitle: "Fin. Freedom",
    description: "Turn vague money goals into ones you actually hit.",
    seoDescription:
      "Free course on long-term financial freedom -- setting concrete goals, building net worth, and what comes after debt-free.",
    icon: "Sparkles",
    comingSoon: true,
    lessons: [],
  },
]

export function getAllCourses(): UniversityCourse[] {
  return UNIVERSITY_COURSES
}

export function getCourse(slug: string): UniversityCourse | undefined {
  return UNIVERSITY_COURSES.find((c) => c.slug === slug)
}

export function getLesson(
  courseSlug: string,
  lessonSlug: string
): { course: UniversityCourse; lesson: UniversityLesson } | undefined {
  const course = getCourse(courseSlug)
  if (!course) return undefined
  const lesson = course.lessons.find((l) => l.slug === lessonSlug)
  if (!lesson) return undefined
  return { course, lesson }
}

// The stable key stored in public.university_progress -- "<course>.<lesson>".
export function lessonKey(courseSlug: string, lessonSlug: string): string {
  return `${courseSlug}.${lessonSlug}`
}

// True only for a lesson key that actually exists in the catalog above --
// the progress API uses this to reject arbitrary client-supplied keys.
export function isValidLessonKey(key: string): boolean {
  const [courseSlug, ...rest] = key.split(".")
  const lessonSlug = rest.join(".")
  return !!getLesson(courseSlug, lessonSlug)
}

export function totalLessonCount(): number {
  return UNIVERSITY_COURSES.reduce((sum, c) => sum + c.lessons.length, 0)
}
