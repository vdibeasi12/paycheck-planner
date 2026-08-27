import { NextResponse } from "next/server"
import { createClient as createUserClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { syncLiabilitiesForItem, syncBalancesForItem } from "@/lib/plaid"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string
  )
}

// POST { item_id }: called after a successful UPDATE MODE Link session
// (see /api/plaid/link-token) -- covers two cases that both reuse the
// existing access_token, so neither needs a fresh exchange: (1) clearing an
// Item's error / pending_expiration / user_permission_revoked status after
// the user re-authenticates, and (2) picking up newly selected account(s)
// after a NEW_ACCOUNTS_AVAILABLE prompt (see /api/plaid/webhook). Case (2)
// is why this route re-syncs liabilities/balances rather than just flipping
// status -- previously it only updated `status`, so an account added via
// update mode wouldn't actually show up as a debt/asset until the next
// manual "Refresh from bank" click or a (often hours-later) Plaid webhook.
export async function POST(req: Request) {
  const userClient = await createUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const itemId = typeof body?.item_id === "string" ? body.item_id : ""
  if (!itemId) {
    return NextResponse.json({ error: "item_id is required" }, { status: 400 })
  }

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

  const totals = { accounts: 0, liabilities: 0, debts: 0, assets: 0 }
  try {
    const r = await syncLiabilitiesForItem(sb, user.id, item.access_token, itemId)
    totals.accounts += r.accounts
    totals.liabilities += r.liabilities
    totals.debts += r.debts
  } catch (liabErr) {
    console.error(
      "Plaid liabilities not available for this item (expected for balance-only accounts):",
      (liabErr as any)?.response?.data || (liabErr as any)?.message || liabErr
    )
  }
  try {
    const r = await syncBalancesForItem(sb, user.id, item.access_token, itemId)
    totals.accounts = Math.max(totals.accounts, r.accounts)
    totals.assets += r.assets
  } catch (balErr) {
    console.error(
      "Plaid balance sync error:",
      (balErr as any)?.response?.data || (balErr as any)?.message || balErr
    )
  }

  const { error } = await sb
    .from("plaid_items")
    .update({
      status: "active",
      new_accounts_available: false,
      updated_at: new Date().toISOString(),
    })
    .eq("item_id", itemId)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: "Could not update connection status." }, { status: 500 })
  }
  return NextResponse.json({ ok: true, ...totals })
}