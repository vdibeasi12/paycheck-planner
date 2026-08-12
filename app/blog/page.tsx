import type { Metadata } from "next"
import Link from "next/link"
import { getAllPosts } from "@/lib/blog"
import BlogSubscribeForm from "@/app/components/BlogSubscribeForm"
import { FileText } from "lucide-react"

export const metadata: Metadata = {
  title: "Financial Hub - Paycheck Planner",
  description:
    "Practical strategies, guides, and tools to help you take control of your money -- backed by the same tools built into Paycheck Planner.",
  alternates: {
    canonical: "/blog",
  },
}

const CATEGORIES = [
  "Paychecks",
  "Budgeting",
  "Debt",
  "Saving",
  "Credit",
  "Financial Freedom",
] as const

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const allPosts = getAllPosts()
  const posts = category ? allPosts.filter((p) => p.category === category) : allPosts

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-3">Financial Hub</h1>
        <p className="text-gray-400 mb-6">
          Practical strategies, guides, and tools to help you take control of your money.
        </p>

        <Link
          href="/worksheet"
          className="mb-8 flex items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 transition hover:border-emerald-500/50"
        >
          <FileText size={28} className="shrink-0 text-emerald-400" />
          <div>
            <p className="font-semibold text-white">Free Paycheck Budget Worksheet</p>
            <p className="text-sm text-gray-400">
              Match every bill to the paycheck that covers it. Get it by email &rarr;
            </p>
          </div>
        </Link>

        <div className="flex flex-wrap gap-2 mb-12">
          <Link
            href="/blog"
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              !category
                ? "border-emerald-400 bg-emerald-500/15 text-emerald-400"
                : "border-gray-800 bg-[#0f172a] text-gray-400 hover:border-gray-700"
            }`}
          >
            All
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/blog?category=${encodeURIComponent(c)}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                category === c
                  ? "border-emerald-400 bg-emerald-500/15 text-emerald-400"
                  : "border-gray-800 bg-[#0f172a] text-gray-400 hover:border-gray-700"
              }`}
            >
              {c}
            </Link>
          ))}
        </div>

        {posts.length === 0 ? (
          <p className="text-gray-400">
            {category ? `No posts in ${category} yet -- check back soon.` : "No posts yet -- check back soon."}
          </p>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="block rounded-2xl border border-gray-800 bg-[#0f172a] p-6 transition hover:border-gray-700"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    {post.category}
                  </span>
                  <p className="text-xs text-gray-500">{formatDate(post.publishedAt)}</p>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{post.title}</h2>
                <p className="text-gray-400">{post.excerpt}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-emerald-400">
                  Read more &rarr;
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12">
          <BlogSubscribeForm />
        </div>
      </div>
    </div>
  )
}
