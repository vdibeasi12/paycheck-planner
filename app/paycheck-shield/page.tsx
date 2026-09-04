import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { computePlanResilience } from "@/lib/planResilience"
import { resolveStartingCash, type CashAccountRow } from "@/lib/cashBalance"
import { toISODate } from "@/lib/paycheckCycles"
import PaycheckShieldView from "@/app/components/PaycheckShieldView"

/**
 * "Paycheck Shield" -- stress-tests the paycheck plan lib/planResilience.ts
 * projects from income/bills/debts/goals: which upcoming paycheck has the
 * least cushion, and what would it take to break it. Free-tier by design
 * (a differentiator hook, not a paywalled deep-insight page like Analytics)
 * -- revisit gating once there are paying customers to weigh against.
 *
 * QA fix (Sep 4 2026, Vince): "Dashboard says $3,002.60 safe to spend, so
 * why does Paycheck Shield say I'm in bad shape" -- two real bugs, not one:
 *
 * 1. This page's debts query was missing covered_by_transfer, so a debt
 *    already paid automatically from a linked transfer (a mortgage, a car
 *    loan) got counted AGAIN here as still owed out of the paycheck --
 *    double-subtracting money that already left the account a different
 *    way. Every other page reading debts either selects "*" or explicitly
 *    includes this column; this one just forgot it.
 * 2. Even with that fixed, every projected cycle here was being judged in
 *    total isolation ("does this one paycheck cover its own bills"),
 *    completely blind to the real Checking balance Safe to Spend already
 *    grounds itself in -- so a paycheck that's thin on its own could still
 *    read as "breaks" here even with thousands of real dollars sitting in
 *    the account to cover it. Now this page resolves that same real
 *    starting cash (lib/cashBalance.ts) and feeds it in as the seed for
 *    every cycle's running balance, so "how strong is my plan" and "am I
 *    safe to spend" are answering from the same real money.
 *
 * QA fix (Sep 4 2026, Vince): a third, separate issue surfaced once the above
 * two were fixed -- a debt with a real grace period (a mortgage due the 1st
 * but not actually late until the 16th) has no accurate way to be modeled:
 * covered_by_transfer excludes it entirely (wrong -- he pays it himself, not
 * an automatic sweep), and without it the debt reads as due/overdue the
 * moment day 1 passes even though he has until the 16th. grace_period_days
 * now selected here (see lib/paycheckCycles.ts's itemsDueInWindow) shifts a
 * debt's effective due date to due_date + grace_period_days for every
 * calculation in this file.
 */
export default async function PaycheckShieldPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [incomeRes, billsRes, debtsRes, goalsRes, cashRes] = await Promise.all([
    supabase.from("income").select("amount, frequency, next_pay_date, income_type").eq("user_id", user.id),
    supabase.from("bills").select("id, name, amount, due_date").eq("user_id", user.id),
    supabase
      .from("debts")
      .select("id, name, minimum_payment, due_date, covered_by_transfer, grace_period_days")
      .eq("user_id", user.id),
    supabase.from("financial_goals").select("target_amount, current_amount, deadline, status").eq("user_id", user.id),
    supabase.from("cash_accounts").select("id, kind, name, balance, balance_as_of").eq("user_id", user.id),
  ])

  const income = incomeRes.data ?? []
  const bills = billsRes.data ?? []
  const debts = debtsRes.data ?? []
  const goals = goalsRes.data ?? []
  const checkingRows = ((cashRes.data ?? []) as CashAccountRow[]).filter((r) => r.kind === "checking")

  const todayISO = toISODate(new Date())
  // lastPaycheckAmount fallback doesn't matter here (only used when there's
  // no checking balance on file) -- 0 is fine since this page never shows it.
  const startingCash = resolveStartingCash(checkingRows, { income, bills, debts, todayISO }, 0)

  const result = computePlanResilience({
    income,
    bills,
    debts,
    goals,
    startingCash: startingCash.amount,
  })

  return <PaycheckShieldView result={result} bills={bills} debts={debts} />
}
