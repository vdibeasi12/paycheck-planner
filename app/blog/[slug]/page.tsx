import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { marked } from "marked"
import { getAllPosts, getPostBySlug } from "@/lib/blog"
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

        <div className="mt-12">
          <BlogSubscribeForm />
        </div>
      </div>
    </div>
  )
}
