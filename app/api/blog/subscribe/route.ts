import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, key, { auth: { persistSession: false } })
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Best-effort: if the request carries a valid Supabase session, link the
// subscription to that user so it also shows as "on" in Account settings.
// Anonymous requests (source: "public_blog") simply omit user_id.
async function getSessionUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization")
  if (!auth || !auth.startsWith("Bearer ")) return null
  const token = auth.slice("Bearer ".length)
  const db = adminDb()
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

export async function POST(req: Request) {
  let body: { email?: string; source?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const email = (body.email || "").trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 })
  }

  const source = body.source === "account_settings" ? "account_settings" : "public_blog"
  const userId = await getSessionUserId(req)
  const db = adminDb()

  const { error } = await db
    .from("blog_subscribers")
    .upsert(
      {
        email,
        user_id: userId,
        source,
        unsubscribed_at: null,
      },
      { onConflict: "email" }
    )

  if (error) {
    return NextResponse.json({ error: "Could not save subscription" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// Used by the Account settings toggle to turn subscription off while signed
// in, without needing the emailed unsubscribe-link token.
export async function DELETE(req: Request) {
  const userId = await getSessionUserId(req)
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }
  const db = adminDb()
  const { error } = await db
    .from("blog_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("user_id", userId)

  if (error) {
    return NextResponse.json({ error: "Could not unsubscribe" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// Used by the Account settings toggle to show current on/off state without
// requiring the user to remember whether they've subscribed before.
export async function GET(req: Request) {
  const userId = await getSessionUserId(req)
  if (!userId) {
    return NextResponse.json({ subscribed: false })
  }
  const db = adminDb()
  const { data } = await db
    .from("blog_subscribers")
    .select("unsubscribed_at")
    .eq("user_id", userId)
    .maybeSingle()

  return NextResponse.json({ subscribed: !!data && !data.unsubscribed_at })
}
