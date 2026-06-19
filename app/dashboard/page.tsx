import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

import SummaryCards from "@/app/components/SummaryCards"
import DebtList from "@/app/components/DebtList"
import DebtStrategyRace from "@/app/components/DebtStrategyRace"
import PaywallOverlay from "@/app/components/PaywallOverlay"
import InfoHint from "@/app/components/InfoHint"
import SafeToSpend from "@/app/components/SafeToSpend"
import { canUseCharts as planCanUseCharts, canUseSnowball as planCanUseSnowball, canUseAI as planCanUseAI } from "@/lib/permissions"

function monthlyFactor(freq?: string | null): number {
  switch ((freq || "monthly").toLowerCase()) {
    case "weekly":
      return 52 / 12
    case "biweekly":
    case "bi-weekly":
    case "every two weeks":
      return 26 / 12
    case "semimonthly":
    case "semi-monthly":
    case "twice a month":
      return 2
    case "quarterly":
      return 1 / 3
    case "annual":
    case "annually":
    case "yearly":
      return 1 / 12
    case "one-time":
    case "one time":
    case "once":
      return 0
    default:
      return 1
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // - SAFER PROFILE FETCH
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, onboarded")
    .eq("id", user.id)
    .maybeSingle()

  // New users complete a short first-run setup before seeing the dashboard.
  if (profile && profile.onboarded === false) {
    redirect("/onboarding")
  }

  // - FALLBACK LOGIC (CRITICAL)
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

  // Safe-to-spend inputs: monthly income and monthly bills (normalized by frequency)
  const { data: incomeData } = await supabase
    .from("income")
    .select("amount, frequency")
    .eq("user_id", user.id)
  const income = Array.isArray(incomeData) ? incomeData : []
  const monthlyIncome = income.reduce(
    (sum, i) => sum + (Number(i.amount) || 0) * monthlyFactor(i.frequency),
    0
  )

  const { data: billsData } = await supabase
    .from("bills")
    .select("amount, frequency")
    .eq("user_id", user.id)
  const bills = Array.isArray(billsData) ? billsData : []
  const monthlyBills = bills.reduce(
    (sum, b) => sum + (Number(b.amount) || 0) * monthlyFactor(b.frequency),
    0
  )

  const canUseCharts = planCanUseCharts(plan)
  const canUseSnowball = planCanUseSnowball(plan)
  const canUseAI = planCanUseAI(plan)

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Plan: <span className="text-white capitalize">{plan}</span>
        </p>
      </div>

      <SafeToSpend monthlyIncome={monthlyIncome} monthlyBills={monthlyBills} monthlyDebt={monthlyPayments} />
      <SummaryCards netWorth={-totalDebt} totalDebt={totalDebt} monthlyPayments={monthlyPayments} percentPaid={0} />
      <DebtList debts={debts} />

      {/* CHARTS */}
      <div className="relative bg-[#0f172a] border border-gray-700 rounded-xl p-6 overflow-hidden">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Charts</h2>
          <InfoHint
            label="About Charts"
            text="Visual breakdowns of your balances and payoff trajectory over time. Included with Momentum and Accelerate."
          />
        </div>

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

      {/* SNOWBALL (PREMIUM ONLY - FIXED) */}
      <div className="relative bg-[#0f172a] border border-gray-700 rounded-xl p-6 overflow-hidden">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Snowball &amp; Avalanche</h2>
          <InfoHint
            label="About Snowball & Avalanche"
            text="Compares two payoff strategies - Snowball (smallest balance first) vs Avalanche (highest interest first) - so you can see which clears your debt faster. Premium."
          />
        </div>

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
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold">AI Insights</h2>
          <InfoHint
            label="About AI Insights"
            text="Personalized, AI-generated suggestions based on your debts and budget. Premium."
          />
        </div>

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