import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { canUseAutopilot } from "@/lib/permissions"
import PremiumGate from "@/app/components/PremiumGate"
import PaycheckAutopilotView from "@/app/components/PaycheckAutopilotView"

/**
 * "Plan Autopilot" -- a few days before a predicted payday (see
 * app/api/cron/paycheck-autopilot/route.ts), Autopilot-tier users get an
 * auto-drafted preview of what that paycheck will need to cover. Gated
 * behind the Autopilot tier itself (lib/permissions.ts's canUseAutopilot),
 * unlike Paycheck Shield -- this one is meant to make the "connected" tier's
 * name literal, not act as a free-tier acquisition hook.
 */
export default async function PaycheckAutopilotPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, is_admin")
    .eq("id", user.id)
    .maybeSingle()

  // Admins act as the top tier so they can use/test every feature, same
  // convention as app/dashboard/page.tsx.
  const effectivePlan = profile?.is_admin ? "connected" : profile?.plan || "free"
  const isSubscribed = canUseAutopilot(effectivePlan)

  type ProposalRow = {
    id: string
    cycle_date: string
    amount: number
    bills_amount: number
    debts_amount: number
    goals_amount: number
    flexible_amount: number
    status: "pending" | "approved" | "dismissed"
  }

  let proposal: ProposalRow | null = null
  if (isSubscribed) {
    const { data } = await supabase
      .from("paycheck_plan_proposals")
      .select("id, cycle_date, amount, bills_amount, debts_amount, goals_amount, flexible_amount, status")
      .eq("user_id", user.id)
      .order("cycle_date", { ascending: false })
      .limit(1)
      .maybeSingle()
    proposal = (data as ProposalRow | null) ?? null
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <PremiumGate isSubscribed={isSubscribed}>
        <PaycheckAutopilotView proposal={proposal} />
      </PremiumGate>
    </div>
  )
}
