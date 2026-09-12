import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { syncCachedBalancesForItem, syncLiabilitiesForItem } from "@/lib/plaid"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Declared explicitly (Sep 12 2026 audit). With no maxDuration this ran at
// the platform default, and the default is far shorter than a serial walk
// over every Plaid item takes -- Vercel kills the function mid-item, so the
// run neither finishes nor reports anything: no JSON, no totals, and the
// items it never reached look identical to the ones it synced fine. 300s is
// the Vercel Pro ceiling for a standard Node function.
export const maxDuration = 300

// Hard ceiling on rows pulled per run. The query had no .limit() at all, so
// the work per run grew linearly with the number of connected banks across
// every user on the platform -- fine at today's handful, quietly fatal at a
// few hundred, and the failure arrives as a timeout on the day it does.
//
// A bare limit alone would be a different bug: it would sync the same first
// N items every day and never touch the rest. The .order() below is what
// makes the limit safe -- least-recently-synced first, so each run picks up
// where the last one left off and the whole population rotates through.
// Every item processed gets plaid_items.updated_at bumped (both sync helpers
// do it on success, the error branch below does it on failure), which is
// what moves it to the back of the queue.
const MAX_ITEMS_PER_RUN = 300

// Stop STARTING new items once we are this close to maxDuration. Returning a
// short, honest batch beats being killed part-way through one: the loop's
// per-item error handling never runs on a kill, so a half-processed item is
// left with no status update and no log line. 60s of headroom is generous
// for one item (two Plaid calls plus the upserts).
const TIME_BUDGET_MS = 240_000

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
  const startedAt = Date.now()

  const { data: items, error } = await db
    .from("plaid_items")
    .select("item_id, user_id, access_token")
    .order("updated_at", { ascending: true, nullsFirst: true })
    .limit(MAX_ITEMS_PER_RUN)

  if (error) {
    return NextResponse.json({ error: "Could not load bank items" }, { status: 500 })
  }

  const queue = items ?? []
  const totals = { items: 0, accounts: 0, liabilities: 0, debts: 0, assets: 0, errors: 0, skipped: 0 }

  for (let i = 0; i < queue.length; i++) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      totals.skipped = queue.length - i
      console.warn(
        `[bank-balance-refresh] time budget reached after ${i} items; ${totals.skipped} deferred to tomorrow's run`
      )
      break
    }
    const it = queue[i]
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

  // batch/elapsed are here to make the ceiling observable rather than
  // invisible: if batch is consistently MAX_ITEMS_PER_RUN, or skipped is
  // consistently non-zero, this cron is no longer keeping up and needs to run
  // more than once a day (or fan out) rather than a bigger limit.
  return NextResponse.json({
    ok: true,
    ...totals,
    batch: queue.length,
    limit: MAX_ITEMS_PER_RUN,
    elapsedMs: Date.now() - startedAt,
  })
}