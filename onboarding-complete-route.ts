import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
  return NextResponse.json({ ok: true })
}
