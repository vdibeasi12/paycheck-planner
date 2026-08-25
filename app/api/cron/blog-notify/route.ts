import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { resend } from "@/lib/email"
import { getAllPosts } from "@/lib/blog"
import { addressLine } from "@/lib/emailFooter"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://paycheckplanner.ai"

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, key, { auth: { persistSession: false } })
}

function escapeHtml(s: any): string {
  return (s == null ? "" : String(s))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization") || ""
  if (!secret || auth !== "Bearer " + secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const from = process.env.EMAIL_FROM
  if (!from) {
    return NextResponse.json({ error: "EMAIL_FROM not set" }, { status: 500 })
  }

  const db = adminDb()
  const today = todayIso()

  // Only posts publishing today or earlier are "live" (matches getAllPosts'
  // own date filter); we specifically want the ones that just went live.
  const posts = getAllPosts().filter((p) => p.publishedAt === today)

  if (posts.length === 0) {
    return NextResponse.json({ ok: true, newPosts: 0, sent: 0 })
  }

  const { data: alreadyNotified } = await db
    .from("blog_post_notifications")
    .select("slug")
    .in(
      "slug",
      posts.map((p) => p.slug)
    )

  const notifiedSlugs = new Set((alreadyNotified || []).map((r: any) => r.slug))
  const newPosts = posts.filter((p) => !notifiedSlugs.has(p.slug))

  if (newPosts.length === 0) {
    return NextResponse.json({ ok: true, newPosts: 0, sent: 0 })
  }

  // Combine public subscribers with logged-in opt-ins, deduped by email.
  // blog_subscribers already contains logged-in users who toggled the
  // account-settings preference on (see /api/blog/subscribe), so this is
  // the single source of truth for who gets emailed.
  const { data: subs, error: subsErr } = await db
    .from("blog_subscribers")
    .select("email, unsubscribe_token")
    .is("unsubscribed_at", null)

  if (subsErr) {
    return NextResponse.json({ error: subsErr.message }, { status: 500 })
  }

  const recipients = Array.from(
    new Map((subs || []).map((s: any) => [String(s.email).toLowerCase(), s])).values()
  )

  let sent = 0
  const results: Array<{ slug: string; recipients: number; sent: number }> = []

  for (const post of newPosts) {
    const postUrl = APP_URL + "/blog/" + post.slug
    let sentForPost = 0

    for (const r of recipients) {
      const unsubUrl =
        APP_URL + "/api/blog/unsubscribe?token=" + encodeURIComponent(r.unsubscribe_token)

      const html =
        '<div style="font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;background:#0b1220;padding:24px;border-radius:12px;">' +
        '<span style="display:inline-block;background:rgba(52,211,153,0.15);color:#34d399;' +
        'font-size:12px;font-weight:600;padding:2px 10px;border-radius:999px;">' +
        escapeHtml(post.category) +
        "</span>" +
        '<h2 style="margin:12px 0 8px;color:#ffffff;">' +
        escapeHtml(post.title) +
        "</h2>" +
        '<p style="color:#9ca3af;">' +
        escapeHtml(post.excerpt) +
        "</p>" +
        '<p style="margin-top:20px;"><a style="color:#34d399;" href="' +
        postUrl +
        '">Read the full post</a></p>' +
        '<p style="margin-top:24px;font-size:12px;color:#6b7280;">' +
        'You are getting this because you subscribed to Financial Hub updates on Paycheck Planner. ' +
        '<a style="color:#6b7280;" href="' +
        unsubUrl +
        '">Unsubscribe</a></p>' +
        addressLine() +
        "</div>"

      const result = await resend.emails.send({
        from,
        to: r.email,
        subject: "New on the Financial Hub: " + post.title,
        html,
      })

      const ok = !(result && (result as any).error)
      if (ok) {
        sentForPost++
        sent++
      }
    }

    await db.from("blog_post_notifications").upsert({ slug: post.slug })
    results.push({ slug: post.slug, recipients: recipients.length, sent: sentForPost })
  }

  return NextResponse.json({
    ok: true,
    newPosts: newPosts.length,
    sent,
    results,
  })
}
