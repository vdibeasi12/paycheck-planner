import type { Metadata } from "next"
import Link from "next/link"
import { getAllPosts } from "@/lib/blog"

export const metadata: Metadata = {
  title: "Blog - Paycheck Planner",
  description:
    "Practical guides on debt payoff, budgeting, and paycheck planning -- backed by the same tools built into Paycheck Planner.",
  alternates: {
    canonical: "/blog",
  },
}

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
        <h1 className="text-4xl font-bold mb-3">Blog</h1>
        <p className="text-gray-400 mb-12">
          Practical guides on debt payoff, budgeting, and paycheck planning.
        </p>

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
                <p className="text-xs text-gray-500 mb-2">{formatDate(post.publishedAt)}</p>
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
