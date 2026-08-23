import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { track } from "@/lib/track"

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const body = await req.json().catch(() => ({} as any))
  const raw = typeof body?.source === "string" ? body.source.trim().slice(0, 60) : ""

  const update: Record<string, unknown> = { onboarded: true }
  if (raw) update.signup_source = raw

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id)

  if (error) {
    console.error("onboarding complete failed:", error.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  // Fire-and-forget: fills the "Complete Onboarding" gap in the
  // Visitor -> Start Free -> Sign Up -> Onboarded -> Activated -> Checkout
  // Started -> Paid funnel (Aug 23 2026 conversion-optimization pass).
  // Never blocks the redirect to /dashboard even if tracking fails.
  await track("onboarding_completed", { userId: user.id, metadata: raw ? { source: raw } : {} })

  return NextResponse.json({ ok: true })
}
