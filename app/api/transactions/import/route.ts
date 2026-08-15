// app/api/transactions/import/route.ts
// Bank statement import (Autopilot Phase 1, CSV; Phase D, PDF). The client
// already parsed/categorized/detected recurring groups locally (CSV via
// lib/csvImport.ts's analyzeCsv(), PDF via app/api/extract-statement +
// analyzeTransactions()) -- this route only receives already-normalized
// data, persists every transaction to the `transactions` table, and turns
// whichever recurring groups the user confirmed in the Review & Import
// screen into real bills/income rows. `source` records which path produced
// the data (see the `source` param below) so it's never ambiguous later.
//
// Tier-gated server-side (not just the client "Import" button) because a
// paid-tier feature that only checked client-side would be trivially
// bypassable by calling this route directly -- same reasoning as
// app/api/plaid/sync's effectivePlan check.
import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { canUseCsvImport } from "@/lib/permissions"
import type { CategorizedTransaction, RecurringGroup, RecurringFrequency } from "@/lib/csvImport"
import { normalizeMerchantKey } from "@/lib/csvImport"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_TRANSACTIONS = 5000
const MAX_RECURRING_GROUPS = 200
const VALID_FREQUENCIES = new Set<RecurringFrequency>(["weekly", "biweekly", "monthly"])

function isValidTransaction(t: unknown): t is CategorizedTransaction {
  if (!t || typeof t !== "object") return false
  const r = t as Record<string, unknown>
  return (
    typeof r.date === "string" &&
    DATE_RE.test(r.date) &&
    typeof r.description === "string" &&
    r.description.trim().length > 0 &&
    r.description.length <= 500 &&
    typeof r.amount === "number" &&
    Number.isFinite(r.amount) &&
    (r.category === undefined || typeof r.category === "string")
  )
}

function isValidRecurringGroup(g: unknown): g is RecurringGroup {
  if (!g || typeof g !== "object") return false
  const r = g as Record<string, unknown>
  return (
    typeof r.key === "string" &&
    r.key.length > 0 &&
    typeof r.label === "string" &&
    r.label.trim().length > 0 &&
    (r.kind === "income" || r.kind === "bill") &&
    typeof r.amount === "number" &&
    Number.isFinite(r.amount) &&
    r.amount > 0 &&
    typeof r.frequency === "string" &&
    VALID_FREQUENCIES.has(r.frequency as RecurringFrequency) &&
    typeof r.lastDate === "string" &&
    DATE_RE.test(r.lastDate)
  )
}

// Advances an ISO date by one cadence interval -- used to turn "last seen on
// this CSV" into a plausible next occurrence for bills.due_date /
// income.next_pay_date.
function nextOccurrence(dateIso: string, frequency: RecurringFrequency): string {
  const d = new Date(dateIso + "T00:00:00Z")
  if (frequency === "weekly") d.setUTCDate(d.getUTCDate() + 7)
  else if (frequency === "biweekly") d.setUTCDate(d.getUTCDate() + 14)
  else d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString().slice(0, 10)
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const rawTransactions = Array.isArray((body as any).transactions) ? (body as any).transactions : []
  const rawGroups = Array.isArray((body as any).confirmedRecurringGroups)
    ? (body as any).confirmedRecurringGroups
    : []
  // Defaults to "csv" so older clients (or any caller that omits it) keep
  // today's behavior exactly. Anything else falls back to "csv" too rather
  // than storing an arbitrary client-supplied string in a provenance field.
  const source = (body as any).source === "pdf" ? "pdf" : "csv"

  if (rawTransactions.length > MAX_TRANSACTIONS) {
    return NextResponse.json(
      { error: `Too many transactions in one import (max ${MAX_TRANSACTIONS}). Try splitting the export into smaller date ranges.` },
      { status: 400 }
    )
  }
  if (rawGroups.length > MAX_RECURRING_GROUPS) {
    return NextResponse.json({ error: "Too many recurring items confirmed at once." }, { status: 400 })
  }

  const transactions = rawTransactions.filter(isValidTransaction) as CategorizedTransaction[]
  const confirmedGroups = rawGroups.filter(isValidRecurringGroup) as RecurringGroup[]
  if (transactions.length === 0 && confirmedGroups.length === 0) {
    return NextResponse.json({ error: "Nothing valid to import." }, { status: 400 })
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
    .select("plan, is_admin")
    .eq("id", user.id)
    .single()
  // Admins act as the top (connected) tier, same convention as plaid/sync.
  const effectivePlan = profile?.is_admin ? "connected" : profile?.plan
  if (!canUseCsvImport(effectivePlan)) {
    return NextResponse.json({ error: "Bank statement import is an Accelerate feature." }, { status: 403 })
  }

  const importBatchId = randomUUID()
  const now = new Date().toISOString()

  // 1) Store every parsed transaction. Duplicate rows (same user/date/
  // description/amount -- e.g. re-uploading the same export) are silently
  // skipped via the plain unique index, not an error.
  let transactionsImported = 0
  const rows = transactions.map((t) => ({
    user_id: user.id,
    import_batch_id: importBatchId,
    posted_date: t.date,
    description: t.description.slice(0, 500),
    amount: t.amount,
    category: t.category ?? null,
    recurring_group_key: normalizeMerchantKey(t.description) || null,
    source,
  }))
  for (const batch of chunk(rows, 500)) {
    const { data, error } = await supabase
      .from("transactions")
      .upsert(batch, { onConflict: "user_id,posted_date,description,amount", ignoreDuplicates: true })
      .select("id")
    if (error) {
      console.error("transactions import: insert batch failed", error)
      continue
    }
    transactionsImported += data?.length ?? 0
  }
  const transactionsSkipped = rows.length - transactionsImported

  // 2) Confirmed recurring groups -> real bills/income rows. Select-then-
  // branch on recurring_group_key (mirrors lib/plaid.ts's
  // syncLiabilitiesForItem) since a partial-unique-index ON CONFLICT can't
  // be targeted by supabase-js's upsert().
  let billsCreated = 0
  let billsUpdated = 0
  let incomeCreated = 0
  let incomeUpdated = 0

  for (const g of confirmedGroups) {
    const name = g.label.slice(0, 200)
    const category = g.category?.slice(0, 100) ?? null

    if (g.kind === "bill") {
      const dueDate = new Date(nextOccurrence(g.lastDate, g.frequency) + "T00:00:00Z").getUTCDate()
      const { data: existing } = await supabase
        .from("bills")
        .select("id")
        .eq("user_id", user.id)
        .eq("recurring_group_key", g.key)
        .maybeSingle()

      if (existing?.id) {
        await supabase
          .from("bills")
          .update({
            name,
            amount: g.amount,
            due_date: dueDate,
            frequency: g.frequency,
            category,
            source,
            updated_at: now,
          })
          .eq("id", existing.id)
        billsUpdated++
      } else {
        const { error } = await supabase.from("bills").insert({
          user_id: user.id,
          name,
          amount: g.amount,
          due_date: dueDate,
          frequency: g.frequency,
          category,
          status: "active",
          source,
          recurring_group_key: g.key,
        })
        if (!error) billsCreated++
        else console.error("transactions import: bill insert failed", error)
      }
    } else {
      const nextPayDate = nextOccurrence(g.lastDate, g.frequency)
      // Defense in depth: lib/csvImport.ts's detectRecurring() already
      // excludes "Transfer"-categorized groups from ever reaching this
      // route, but a client could in principle submit a hand-built
      // confirmedRecurringGroups payload directly against this API. Tag it
      // correctly either way so it's excluded from income totals
      // (app/dashboard/page.tsx, app/income/page.tsx) rather than counted.
      const incomeType = g.category === "Transfer" ? "transfer" : "other"
      const { data: existing } = await supabase
        .from("income")
        .select("id")
        .eq("user_id", user.id)
        .eq("recurring_group_key", g.key)
        .maybeSingle()

      if (existing?.id) {
        await supabase
          .from("income")
          .update({
            name,
            amount: g.amount,
            frequency: g.frequency,
            income_type: incomeType,
            next_pay_date: nextPayDate,
            source,
            updated_at: now,
          })
          .eq("id", existing.id)
        incomeUpdated++
      } else {
        const { error } = await supabase.from("income").insert({
          user_id: user.id,
          name,
          amount: g.amount,
          frequency: g.frequency,
          income_type: incomeType,
          next_pay_date: nextPayDate,
          source,
          recurring_group_key: g.key,
        })
        if (!error) incomeCreated++
        else console.error("transactions import: income insert failed", error)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    transactionsImported,
    transactionsSkipped,
    billsCreated,
    billsUpdated,
    incomeCreated,
    incomeUpdated,
  })
}
