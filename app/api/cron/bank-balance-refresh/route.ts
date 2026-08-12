import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { syncBalancesForItem } from "@/lib/plaid"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, key, { auth: { persistSession: false } })
}

// GET: daily cron. Refreshes checking/savings balances for every "auth"
// -product Plaid item across all users, mirroring each into `assets`.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization") || ""
  if (!secret || auth !== "Bearer " + secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = adminDb()

  const { data: items, error } = await db
    .from("plaid_items")
    .select("item_id, user_id, access_token")
    .eq("product", "auth")

  if (error) {
    return NextResponse.json({ error: "Could not load bank items" }, { status: 500 })
  }

  const totals = { items: 0, accounts: 0, assets: 0, errors: 0 }
  for (const it of items ?? []) {
    try {
      const r = await syncBalancesForItem(db, it.user_id, it.access_token, it.item_id)
      totals.items += 1
      totals.accounts += r.accounts
      totals.assets += r.assets
    } catch (e) {
      console.error("Bank balance refresh failed for item", it.item_id, e)
      totals.errors += 1
      await db
        .from("plaid_items")
        .update({ status: "error", updated_at: new Date().toISOString() })
        .eq("item_id", it.item_id)
    }
  }

  return NextResponse.json({ ok: true, ...totals })
}