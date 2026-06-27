import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { plaid, PLAID_ENABLED, planCanUsePlaid } from "@/lib/plaid"
import { CountryCode, Products } from "plaid"

export const dynamic = "force-dynamic"

export async function POST() {
  if (!PLAID_ENABLED) {
    return NextResponse.json(
      { error: "Bank linking is not available yet." },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single()
  if (!planCanUsePlaid(profile?.plan)) {
    return NextResponse.json(
      { error: "Bank sync is an Autopilot feature." },
      { status: 403 }
    )
  }

  try {
    const res = await plaid.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "Paycheck Planner",
      products: [Products.Liabilities],
      country_codes: [CountryCode.Us],
      language: "en",
      webhook: process.env.PLAID_WEBHOOK_URL || undefined,
    })
    return NextResponse.json({ link_token: res.data.link_token })
  } catch (err) {
    console.error("Plaid link-token error:", err)
    return NextResponse.json(
      { error: "Could not start bank linking." },
      { status: 500 }
    )
  }
}