import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { computeCurrentBreakdown, computeDrift } from "@/lib/planDrift"
import PlanDriftView from "@/app/components/PlanDriftView"

/**
 * "Plan Drift" -- free-tier by design, same reasoning as Paycheck Shield and
 * Paycheck Surplus: a differentiator hook, not a paywalled deep-insight page.
 * There's also a real dependency reason to keep it free -- Surplus decisions
 * (also free-tier) are one of the things that can visibly move a plan, and
 * gating Drift behind a paid tier would mean a free user could cause drift
 * they'd never be able to see. Revisit gating once there are paying
 * customers to weigh against, same as Shield.
 *
 * The snapshot itself is written in app/dashboard/page.tsx the moment each
 * cycle starts (lib/planDrift.ts's detectStartingCycleSnapshot) -- this page
 * only reads the most recent one back and recomputes the live side.
 */
export default async function PlanDriftPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [incomeRes, billsRes, debtsRes, goalsRes, snapshotRes] = await Promise.all([
    supabase.from("income").select("amount, frequency, next_pay_date, income_type").eq("user_id", user.id),
    supabase.from("bills").select("amount, due_date").eq("user_id", user.id),
    supabase.from("debts").select("minimum_payment, due_date").eq("user_id", user.id),
    supabase.from("financial_goals").select("target_amount, current_amount, deadline, status").eq("user_id", user.id),
    supabase
      .from("paycheck_plan_snapshots")
      .select("cycle_date, amount, bills_amount, debts_amount, goals_amount, flexible_amount")
      .eq("user_id", user.id)
      .order("cycle_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const snapshotRow = snapshotRes.data
  if (!snapshotRow) {
    return <PlanDriftView planned={null} current={null} drift={null} />
  }

  const planned = {
    cycleDate: snapshotRow.cycle_date,
    amount: Number(snapshotRow.amount) || 0,
    billsAmount: Number(snapshotRow.bills_amount) || 0,
    debtsAmount: Number(snapshotRow.debts_amount) || 0,
    goalsAmount: Number(snapshotRow.goals_amount) || 0,
    flexibleAmount: Number(snapshotRow.flexible_amount) || 0,
  }

  const current = computeCurrentBreakdown(snapshotRow.cycle_date, {
    income: incomeRes.data ?? [],
    bills: billsRes.data ?? [],
    debts: debtsRes.data ?? [],
    goals: goalsRes.data ?? [],
  })

  const drift = current ? computeDrift(planned, current) : null

  return <PlanDriftView planned={planned} current={current} drift={drift} />
}
