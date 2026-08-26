import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { computeSafeToSpend } from "@/lib/safeToSpend"
import SurvivalModeView from "@/app/components/SurvivalModeView"

/**
 * "Survive until payday" -- the stripped-down view of the same
 * lib/safeToSpend.ts numbers the Dashboard's Paycheck Countdown card shows,
 * with nothing else on the page. Same data, no distractions. Ties into the
 * 30-Day Challenge content (marketing/growth plan, Aug 21) as the in-app
 * companion for anyone deliberately tightening up before a payday.
 */
export default async function SurvivalModePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [incomeRes, billsRes, debtsRes, goalsRes] = await Promise.all([
    supabase.from("income").select("amount, frequency, next_pay_date, income_type").eq("user_id", user.id),
    supabase.from("bills").select("amount, due_date").eq("user_id", user.id),
    supabase.from("debts").select("minimum_payment, due_date").eq("user_id", user.id),
    supabase.from("financial_goals").select("target_amount, current_amount, deadline, status").eq("user_id", user.id),
  ])

  const result = computeSafeToSpend({
    income: incomeRes.data ?? [],
    bills: billsRes.data ?? [],
    debts: debtsRes.data ?? [],
    goals: goalsRes.data ?? [],
  })

  return <SurvivalModeView result={result} />
}
