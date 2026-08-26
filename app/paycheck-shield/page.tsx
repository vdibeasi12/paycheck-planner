import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { computePlanResilience } from "@/lib/planResilience"
import PaycheckShieldView from "@/app/components/PaycheckShieldView"

/**
 * "Paycheck Shield" -- stress-tests the paycheck plan lib/planResilience.ts
 * projects from income/bills/debts/goals: which upcoming paycheck has the
 * least cushion, and what would it take to break it. Free-tier by design
 * (a differentiator hook, not a paywalled deep-insight page like Analytics)
 * -- revisit gating once there are paying customers to weigh against.
 */
export default async function PaycheckShieldPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [incomeRes, billsRes, debtsRes, goalsRes] = await Promise.all([
    supabase.from("income").select("amount, frequency, next_pay_date, income_type").eq("user_id", user.id),
    supabase.from("bills").select("id, name, amount, due_date").eq("user_id", user.id),
    supabase.from("debts").select("id, name, minimum_payment, due_date").eq("user_id", user.id),
    supabase.from("financial_goals").select("target_amount, current_amount, deadline, status").eq("user_id", user.id),
  ])

  const bills = billsRes.data ?? []
  const debts = debtsRes.data ?? []

  const result = computePlanResilience({
    income: incomeRes.data ?? [],
    bills,
    debts,
    goals: goalsRes.data ?? [],
  })

  return <PaycheckShieldView result={result} bills={bills} debts={debts} />
}
