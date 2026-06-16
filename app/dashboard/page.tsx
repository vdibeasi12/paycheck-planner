import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

import SummaryCards from "@/app/components/SummaryCards"
import DebtList from "@/app/components/DebtList"
import DebtStrategyRace from "@/app/components/DebtStrategyRace"
import PaywallOverlay from "@/app/components/PaywallOverlay"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // ✅ SAFER PROFILE FETCH
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, onboarded")
    .eq("id", user.id)
    .maybeSingle()

  // New users complete a short first-run setup before seeing the dashboard.
  if (profile && profile.onboarded === false) {
    redirect("/onboarding")
  }

  // 🔥 FALLBACK LOGIC (CRITICAL)
  let plan = "free"

  if (profile?.plan) {
    plan = profile.plan
  }

  // Fetch debts for summary cards + list
  const { data: debtsData } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", user.id)
  const debts = Array.isArray(debtsData) ? debtsData : []
  const totalDebt = debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0)
  const monthlyPayments = debts.reduce((sum, d) => sum + (Number(d.minimum_payment) || 0), 0)

  const canUseCharts = plan === "starter" || plan === "premium"
  const canUseSnowball = plan === "premium"
  const canUseAI = plan === "premium"

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Plan: <span className="text-white capitalize">{plan}</span>
        </p>
      </div>

      <SummaryCards netWorth={-totalDebt} totalDebt={totalDebt} monthlyPayments={monthlyPayments} percentPaid={0} />
      <DebtList debts={debts} />

      {/* CHARTS */}
      <div className="relative bg-[#0f172a] border border-gray-700 rounded-xl p-6 overflow-hidden">
        <h2 className="text-lg font-semibold mb-4">Charts</h2>

        <div className={!canUseCharts ? "opacity-40 pointer-events-none" : ""}>
          <div>{/* chart component */}</div>
        </div>

        {!canUseCharts && (
          <PaywallOverlay
            priceId="price_1TO2RmFv1EcTs6LYp5OOlvOK"
            title="Unlock Charts"
            description="Upgrade to Starter to access charts."
          />
        )}
      </div>

      {/* SNOWBALL (PREMIUM ONLY — FIXED) */}
      <div className="relative bg-[#0f172a] border border-gray-700 rounded-xl p-6 overflow-hidden">
        <h2 className="text-lg font-semibold mb-4">
          Snowball & Avalanche
        </h2>

        <div className={!canUseSnowball ? "opacity-40 pointer-events-none" : ""}>
          <DebtStrategyRace plan={plan} />
        </div>

        {!canUseSnowball && (
          <PaywallOverlay
            priceId="price_1TO2SSFv1EcTs6LYVswF0AwU"
            title="Unlock Debt Strategies"
            description="Premium plan required."
          />
        )}
      </div>

      {/* AI */}
      <div className="relative bg-[#0f172a] border border-gray-700 rounded-xl p-6 overflow-hidden">
        <h2 className="text-lg font-semibold mb-4">AI Insights</h2>

        <div className={!canUseAI ? "opacity-40 pointer-events-none" : ""}>
          <div>{/* AI component */}</div>
        </div>

        {!canUseAI && (
          <PaywallOverlay
            priceId="price_1TO2SSFv1EcTs6LYVswF0AwU"
            title="Unlock AI Insights"
          />
        )}
      </div>

    </div>
  )
}