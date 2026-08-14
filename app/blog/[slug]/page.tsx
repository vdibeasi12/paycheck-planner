import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { marked } from "marked"
import { Calculator, ArrowRight } from "lucide-react"
import { getAllPosts, getPostBySlug } from "@/lib/blog"
import { getCalculatorMeta } from "@/lib/calculators"
import BlogSubscribeForm from "@/app/components/BlogSubscribeForm"

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  return {
    title: `${post.title} - Paycheck Planner Blog`,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://paycheckplanner.ai/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
    },
  }
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const html = marked.parse(post.content, { async: false }) as string

  // Internal linking, both directions: this post -> the one free tool most
  // relevant to it (falls back to the calculators index if the post has no
  // strong match), and this post -> up to 3 other posts in the same
  // category. Neither existed before -- every post was previously a dead
  // end with no path to a tool or to more content, which hurts both
  // discovery (Google has fewer signals connecting these pages) and
  // conversion (a reader finishing the post had nowhere obvious to go next).
  const relatedTool = post.relatedCalculator ? getCalculatorMeta(post.relatedCalculator) : undefined
  const relatedPosts = getAllPosts()
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 3)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    author: {
      "@type": "Organization",
      name: "Paycheck Planner",
    },
    publisher: { "@id": "https://paycheckplanner.ai/#organization" },
    mainEntityOfPage: `https://paycheckplanner.ai/blog/${post.slug}`,
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-6">
        <Link href="/blog" className="text-sm font-semibold text-emerald-400 hover:underline">
          &larr; Back to Financial Hub
        </Link>

        <div className="mt-6 flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            {post.category}
          </span>
          <p className="text-xs text-gray-500">{formatDate(post.publishedAt)}</p>
        </div>
        <h1 className="mt-2 text-4xl font-bold">{post.title}</h1>

        <div
          className="prose prose-invert mt-8 max-w-none prose-headings:text-white prose-a:text-emerald-400 prose-strong:text-white"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div className="mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          {relatedTool ? (
            <>
              <div className="flex items-start gap-3">
                <Calculator size={22} className="mt-0.5 shrink-0 text-emerald-400" />
                <div>
                  <p className="font-semibold text-white">Try it yourself: {relatedTool.title}</p>
                  <p className="mt-1 text-sm text-gray-400">{relatedTool.description}</p>
                </div>
              </div>
              <Link
                href={`/calculators/${relatedTool.slug}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
              >
                Open the free {relatedTool.shortTitle} calculator <ArrowRight size={15} />
              </Link>
            </>
          ) : (
            <>
              <p className="font-semibold text-white">Put this into practice</p>
              <p className="mt-1 text-sm text-gray-400">
                Free calculators for the paycheck and budgeting math this article covers.
              </p>
              <Link
                href="/calculators"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
              >
                Browse free calculators <ArrowRight size={15} />
              </Link>
            </>
          )}
        </div>

        {relatedPosts.length > 0 && (
          <div className="mt-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              More on {post.category}
            </p>
            <div className="space-y-3">
              {relatedPosts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="block rounded-xl border border-gray-800 bg-[#0f172a] p-4 transition hover:border-gray-700"
                >
                  <p className="font-semibold text-white">{p.title}</p>
                  <p className="mt-1 text-sm text-gray-400">{p.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12">
          <BlogSubscribeForm />
        </div>
      </div>
    </div>
  )
}
