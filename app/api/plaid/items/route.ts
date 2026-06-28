import { NextResponse } from "next/server"
import { createClient as createUserClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { PLAID_ENABLED, planCanUsePlaid } from "@/lib/plaid"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )
}

// GET: the signed-in user's linked banks, for display only. Never returns the
// access token. Also reports eligibility so the UI can hide itself for tiers
// that can't use bank sync.
export async function GET() {
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
  const effectivePlan = profile?.is_admin ? "connected" : profile?.plan
  const eligible = planCanUsePlaid(effectivePlan)

  if (!eligible) {
    return NextResponse.json({ eligible: false, enabled: PLAID_ENABLED, items: [] })
  }

  const sb = serviceClient()
  const { data: items } = await sb
    .from("plaid_items")
    .select("item_id, institution_name, status, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  const result: {
    item_id: string
    institution_name: string | null
    status: string | null
    updated_at: string | null
    accounts: number
  }[] = []
  for (const it of items ?? []) {
    const { count } = await sb
      .from("plaid_accounts")
      .select("account_id", { count: "exact", head: true })
      .eq("item_id", it.item_id)
    result.push({
      item_id: it.item_id,
      institution_name: it.institution_name,
      status: it.status,
      updated_at: it.updated_at,
      accounts: count ?? 0,
    })
  }

  return NextResponse.json({ eligible: true, enabled: PLAID_ENABLED, items: result })
}