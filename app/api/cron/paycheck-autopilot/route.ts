import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendPushToUser } from "@/lib/push"
import { generateProposal } from "@/lib/paycheckAutopilot"
import { CRON_MAX_RESULT_ROWS, fetchAllRows, forEachWithBudget } from "@/lib/cronBatch"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Bare literal, not an imported constant -- Next.js reads route-segment
// config by static analysis, so an import can silently fall back to the
// platform default. See the note at the top of lib/cronBatch.ts.
export const maxDuration = 300

// How many days before the predicted payday the proposal is drafted --
// fixed, same reasoning as app/api/cron/debt-reminder/route.ts's
// DAYS_BEFORE: mirrors the existing payday-reminder default rather than
// adding a second "days before" setting to notification_preferences.
const DAYS_AHEAD = 3

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Plan Autopilot: drafts what an Autopilot-tier user's next paycheck will
 * need to cover, a few days before it's predicted to arrive, so they don't
 * have to go build that awareness themselves. Reuses the push_payday_reminder
 * preference rather than adding a new toggle -- this is an extension of the
 * same "tell me before payday" idea, just for Autopilot users specifically.
 * The proposal itself is generated from real bills/debts/goals via
 * lib/paycheckAutopilot.ts (built on the shared lib/paycheckCycles.ts
 * projection engine) -- nothing here invents numbers of its own.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization") || ""
  if (!secret || auth !== "Bearer " + secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = adminDb()

  const startedAt = Date.now()

  const {
    rows: profiles,
    error: profilesErr,
    truncated,
  } = await fetchAllRows<any>("paycheck-autopilot", (from, to) =>
    db.from("profiles").select("id").eq("plan", "connected").order("id", { ascending: true }).range(from, to)
  )

  if (profilesErr) {
    return NextResponse.json({ error: (profilesErr as any)?.message || "Could not load profiles" }, { status: 500 })
  }

  let created = 0
  let pushSent = 0
  const results: Array<{ user_id: string; created: boolean; pushed: boolean }> = []

  // This is the heaviest of the crons per user -- five queries plus
  // generateProposal -- and unlike the reminder routes it sends no email, so
  // there is no per-second send limit to respect. Modest concurrency is what
  // keeps it inside the budget; it is deliberately not higher, to leave the
  // shared Supabase connection pool room for live traffic.
  const budget = await forEachWithBudget(
    profiles,
    async (profile: any) => {
    const userId = profile.id as string

    const [{ data: incomeData }, { data: billsData }, { data: debtsData }, { data: goalsData }] = await Promise.all([
      db.from("income").select("amount, frequency, next_pay_date, income_type").eq("user_id", userId),
      db.from("bills").select("amount, due_date").eq("user_id", userId),
      db.from("debts").select("minimum_payment, due_date").eq("user_id", userId),
      db.from("financial_goals").select("target_amount, current_amount, deadline, status").eq("user_id", userId),
    ])

    const proposal = generateProposal({
      income: incomeData || [],
      bills: billsData || [],
      debts: debtsData || [],
      goals: goalsData || [],
      daysAhead: DAYS_AHEAD,
    })

    if (!proposal) {
      results.push({ user_id: userId, created: false, pushed: false })
      return
    }

    const { data: existing } = await db
      .from("paycheck_plan_proposals")
      .select("id")
      .eq("user_id", userId)
      .eq("cycle_date", proposal.cycleDate)
      .maybeSingle()

    if (existing) {
      results.push({ user_id: userId, created: false, pushed: false })
      return
    }

    const { error: insertErr } = await db.from("paycheck_plan_proposals").insert({
      user_id: userId,
      cycle_date: proposal.cycleDate,
      amount: proposal.amount,
      bills_amount: proposal.billsAmount,
      debts_amount: proposal.debtsAmount,
      goals_amount: proposal.goalsAmount,
      flexible_amount: proposal.flexibleAmount,
    })

    if (insertErr) {
      console.error("[cron:paycheck-autopilot] proposal insert failed for", userId, insertErr)
      results.push({ user_id: userId, created: false, pushed: false })
      return
    }
    created++

    const { data: pref } = await db
      .from("notification_preferences")
      .select("push_payday_reminder")
      .eq("user_id", userId)
      .maybeSingle()

    let pushed = false
    if (pref?.push_payday_reminder) {
      const result = await sendPushToUser(userId, {
        title: "Your next paycheck plan is ready",
        body: "Review what's coming up and approve it before payday.",
      })
      pushed = result.sent > 0
      if (pushed) pushSent++
    }

    results.push({ user_id: userId, created: true, pushed })
    },
    { startedAt, label: "paycheck-autopilot", concurrency: 4 }
  )

  return NextResponse.json({
    ok: budget.skipped === 0 && !truncated,
    eligible: profiles.length,
    processed: budget.processed,
    skipped: budget.skipped,
    failed: budget.failed,
    rowsTruncated: truncated,
    created,
    pushSent,
    results: results.slice(0, CRON_MAX_RESULT_ROWS),
    resultsTruncated: results.length > CRON_MAX_RESULT_ROWS,
    elapsedMs: Date.now() - startedAt,
  })
}
