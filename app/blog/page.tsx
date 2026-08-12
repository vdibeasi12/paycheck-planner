import type { Metadata } from "next"
import Link from "next/link"
import { getAllPosts } from "@/lib/blog"

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

export default function BlogIndexPage() {
  const posts = getAllPosts()

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-3">Financial Hub</h1>
        <p className="text-gray-400 mb-6">
          Practical strategies, guides, and tools to help you take control of your money.
        </p>

        <div className="flex flex-wrap gap-2 mb-12">
          {CATEGORIES.map((c) => (
            <span
              key={c}
              className="rounded-full border border-gray-800 bg-[#0f172a] px-3 py-1 text-xs font-medium text-gray-400"
            >
              {c}
            </span>
          ))}
        </div>

        {posts.length === 0 ? (
          <p className="text-gray-400">No posts yet -- check back soon.</p>
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
      </div>
    </div>
  )
}
