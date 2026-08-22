import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Reverts a referral-granted free Momentum month once it expires. Runs
// daily alongside the site's other cron jobs (see vercel.json). Only ever
// touches profiles that are (a) still on 'starter' with a referral expiry
// in the past, and (b) NOT a real, actively-paying subscriber -- someone
// who genuinely subscribed to Momentum in the meantime keeps their plan
// regardless of what their old referral reward window says.
function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } }
  )
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization") || ""
  if (!secret || auth !== "Bearer " + secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = adminDb()

  const { data: expired, error: selectErr } = await db
    .from("profiles")
    .select("id")
    .eq("plan", "starter")
    .neq("subscription_status", "active")
    .not("referral_reward_expires_at", "is", null)
    .lt("referral_reward_expires_at", new Date().toISOString())

  if (selectErr) {
    return NextResponse.json({ error: selectErr.message }, { status: 500 })
  }

  const ids = (expired || []).map((p) => p.id)
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, reverted: 0 })
  }

  const { error: updateErr } = await db
    .from("profiles")
    .update({ plan: "free", referral_reward_expires_at: null })
    .in("id", ids)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, reverted: ids.length })
}
