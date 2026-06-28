import { NextResponse } from "next/server"
import { createClient as createUserClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { PLAID_ENABLED, planCanUsePlaid, syncLiabilitiesForItem } from "@/lib/plaid"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )
}

// POST: manually refresh liabilities for every bank the signed-in user has
// linked. Pulls fresh data from Plaid and mirrors it into their debts.
export async function POST() {
  if (!PLAID_ENABLED) {
    return NextResponse.json({ error: "Bank sync is not available yet." }, { status: 503 })
  }

  const userClient = await createUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("plan, is_admin")
    .eq("id", user.id)
    .single()
  // Admins act as the top (connected) tier.
  const effectivePlan = profile?.is_admin ? "connected" : profile?.plan
  if (!planCanUsePlaid(effectivePlan)) {
    return NextResponse.json({ error: "Bank sync is an Autopilot feature." }, { status: 403 })
  }

  const sb = serviceClient()
  const { data: items } = await sb
    .from("plaid_items")
    .select("item_id, access_token")
    .eq("user_id", user.id)

  const totals = { items: 0, accounts: 0, liabilities: 0, debts: 0 }
  for (const it of items ?? []) {
    try {
      const r = await syncLiabilitiesForItem(sb, user.id, it.access_token, it.item_id)
      totals.items += 1
      totals.accounts += r.accounts
      totals.liabilities += r.liabilities
      totals.debts += r.debts
    } catch (e) {
      console.error("Plaid sync failed for item", it.item_id, e)
      await sb
        .from("plaid_items")
        .update({ status: "error", updated_at: new Date().toISOString() })
        .eq("item_id", it.item_id)
    }
  }

  return NextResponse.json({ ok: true, ...totals })
}