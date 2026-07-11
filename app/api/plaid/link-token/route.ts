import { NextResponse } from "next/server"
import { createClient as createUserClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { plaid, PLAID_ENABLED, planCanUsePlaid } from "@/lib/plaid"
import { CountryCode, Products } from "plaid"

export const dynamic = "force-dynamic"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )
}

// POST {}: creates a link_token for a brand-new bank connection.
// POST { item_id }: creates a link_token in UPDATE MODE for an existing,
// broken connection (expired login, revoked permission, etc). Update mode
// reuses the Item's existing access_token -- no new exchange is needed on
// success, see /api/plaid/reconnect.
export async function POST(req: Request) {
  if (!PLAID_ENABLED) {
    return NextResponse.json(
      { error: "Bank linking is not available yet." },
      { status: 503 }
    )
  }

  const supabase = await createUserClient()
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

  const body = await req.json().catch(() => null)
  const itemId = typeof body?.item_id === "string" ? body.item_id : ""

  let accessToken = ""
  if (itemId) {
    const sb = serviceClient()
    const { data: item } = await sb
      .from("plaid_items")
      .select("access_token")
      .eq("item_id", itemId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!item) {
      return NextResponse.json({ error: "Connection not found." }, { status: 404 })
    }
    accessToken = item.access_token
  }

  try {
    const params: Record<string, unknown> = {
      user: { client_user_id: user.id },
      client_name: "Paycheck Planner",
      country_codes: [CountryCode.Us],
      language: "en",
      webhook: process.env.PLAID_WEBHOOK_URL || undefined,
    }
    if (accessToken) {
      params.access_token = accessToken
    } else {
      params.products = [Products.Liabilities]
    }

    const res = await plaid.linkTokenCreate(params as any)
    return NextResponse.json({ link_token: res.data.link_token })
  } catch (err) {
    console.error("Plaid link-token error:", err)
    return NextResponse.json(
      { error: "Could not start bank linking." },
      { status: 500 }
    )
  }
}