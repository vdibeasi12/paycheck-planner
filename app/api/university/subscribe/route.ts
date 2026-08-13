import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { checkAnonRateLimit, getClientIp } from "@/lib/anonRateLimit"
import { track } from "@/lib/track"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, key, { auth: { persistSession: false } })
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  const source = typeof body.source === "string" ? body.source.slice(0, 60) : null

  const underLimit = await checkAnonRateLimit("university-subscribe", getClientIp(req))
  if (!underLimit) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
  }

  const db = adminDb()
  const { error } = await db
    .from("university_waitlist")
    .upsert({ email, source }, { onConflict: "email" })

  if (error) {
    console.error("university waitlist error", error)
    return NextResponse.json({ error: "Could not save your request" }, { status: 500 })
  }

  await track("lead_magnet_subscribed", { metadata: { magnet: "university", source } })

  return NextResponse.json({ ok: true })
}
