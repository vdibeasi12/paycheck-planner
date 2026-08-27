import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { syncCachedBalancesForItem, syncLiabilitiesForItem } from "@/lib/plaid"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, key, { auth: { persistSession: false } })
}

// GET: daily cron. Keeps every connected Plaid item -- across every user --
// current WITHOUT the user having to do anything, which is the whole point
// of the Autopilot tier: no manual "Refresh from bank" click, no manual data
// entry. Two things happen per item:
//
// 1) Liabilities/debts (syncLiabilitiesForItem): mirrors credit
//    cards/student loans/mortgages into the user's `debts` table. Added
//    2026-08-27 -- this route used to ONLY refresh checking/savings
//    balances, so a brand-new credit card at an already-connected bank
//    (Plaid auto-includes it in the next liabilitiesGet response for most
//    non-OAuth/credential-based institutions, no re-link needed) would sit
//    unsynced until the user manually refreshed or Plaid's LIABILITIES
//    webhook happened to fire. This closes that gap for the common case.
//    (The separate case where Plaid genuinely requires re-consent to see a
//    new account -- mainly OAuth institutions -- still needs the user to
//    run the "Add new accounts" update-mode flow once; see
//    plaid_items.new_accounts_available / /api/plaid/reconnect. Plaid does
//    not allow silently granting a new account's data without the account
//    holder selecting it in Link at least once -- that's a Plaid/bank
//    consent requirement, not something this app's backend can skip.)
//    liabilitiesGet is Plaid's FREE cached pull for Liabilities-tagged
//    Items (same "refreshed roughly daily in the background" cache
//    syncCachedBalancesForItem below relies on) -- not the paid real-time
//    endpoint -- so running it daily across every item doesn't add per-call
//    cost. It's a safe no-op (throws, caught below) for items with no
//    liability-eligible accounts, e.g. checking/savings-only.
//
// 2) Checking/savings balances (syncCachedBalancesForItem): unchanged from
//    before, mirrors into `assets`. Also the FREE cached pull
//    (/accounts/get), not the paid real-time one (/accounts/balance/get).
//
// Not scoped to a specific `product` tag -- both helpers are safe no-ops for
// items that don't have the relevant account type, so this covers every
// item regardless of which product(s) it was connected with. An item is
// only marked "error" if BOTH calls fail for it.
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

  if (error) {
    return NextResponse.json({ error: "Could not load bank items" }, { status: 500 })
  }

  const totals = { items: 0, accounts: 0, liabilities: 0, debts: 0, assets: 0, errors: 0 }
  for (const it of items ?? []) {
    let touched = false
    try {
      const r = await syncLiabilitiesForItem(db, it.user_id, it.access_token, it.item_id)
      totals.accounts += r.accounts
      totals.liabilities += r.liabilities
      totals.debts += r.debts
      touched = true
    } catch (e) {
      console.error("Daily liabilities sync failed for item", it.item_id, e)
    }
    try {
      const r = await syncCachedBalancesForItem(db, it.user_id, it.access_token, it.item_id)
      totals.accounts += r.accounts
      totals.assets += r.assets
      touched = true
    } catch (e) {
      console.error("Daily balance sync failed for item", it.item_id, e)
    }
    if (touched) {
      totals.items += 1
    } else {
      totals.errors += 1
      await db
        .from("plaid_items")
        .update({ status: "error", updated_at: new Date().toISOString() })
        .eq("item_id", it.item_id)
    }
  }

  return NextResponse.json({ ok: true, ...totals })
}