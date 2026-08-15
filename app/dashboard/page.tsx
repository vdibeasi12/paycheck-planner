import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

import SummaryCards from "@/app/components/SummaryCards"
import DebtList from "@/app/components/DebtList"
import DebtStrategyRace from "@/app/components/DebtStrategyRace"
import PaywallOverlay from "@/app/components/PaywallOverlay"
import InfoHint from "@/app/components/InfoHint"
import SafeToSpend from "@/app/components/SafeToSpend"
import AchievementsStrip from "@/app/components/AchievementsStrip"
import { canUseCharts as planCanUseCharts, canUseSnowball as planCanUseSnowball, canUseAI as planCanUseAI } from "@/lib/permissions"
import DashboardCharts from "@/app/components/DashboardCharts"
import AIInsightPanel from "@/app/components/AIInsightPanel"
import { maybeSendWelcomeEmail } from "@/lib/sendWelcomeEmail"
import { monthlyFactor } from "@/lib/monthlyFactor"
import { findBillDebtOverlaps } from "@/lib/billDebtOverlap"
import BillDebtOverlapWarning from "@/app/components/BillDebtOverlapWarning"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Best-effort last-seen timestamp for the inactivity push trigger
  // (app/api/cron/inactivity-nudge). Not awaited -- a dashboard load
  // shouldn't wait on this, and a failure here shouldn't break the page.
  void (async () => {
    try {
      await supabase
        .from("profiles")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", user.id)
    } catch {
      // best-effort only
    }
  })()

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, onboarded, welcome_email_sent, is_admin")
    .eq("id", user.id)
    .maybeSingle()

  // One-time welcome email on the first real dashboard load (idempotent).
  if (profile && profile.welcome_email_sent === false) {
    await maybeSendWelcomeEmail(user.id)
  }

  let plan = "free"
  if (profile?.plan) {
    plan = profile.plan
  }

  const { data: debtsData } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", user.id)
  const debts = Array.isArray(debtsData) ? debtsData : []
  const totalDebt = debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0)
  const monthlyPayments = debts.reduce((sum, d) => sum + (Number(d.minimum_payment) || 0), 0)

  const { data: incomeData } = await supabase
    .from("income")
    .select("amount, frequency, income_type")
    .eq("user_id", user.id)
  const income = Array.isArray(incomeData) ? incomeData : []
  // "transfer" rows are money moving between the user's own accounts (e.g. a
  // CSV-detected "Transfer from Chime Checking Account"), not real income --
  // counting them here is what previously inflated the dashboard's income
  // total (and therefore Safe-to-Spend) well past what the user actually
  // earns. See app/income/page.tsx for where income_type is set.
  const monthlyIncome = income
    .filter((i) => i.income_type !== "transfer")
    .reduce((sum, i) => sum + (Number(i.amount) || 0) * monthlyFactor(i.frequency), 0)

  const { data: billsData } = await supabase
    .from("bills")
    .select("id, name, amount, frequency")
    .eq("user_id", user.id)
  const bills = Array.isArray(billsData) ? billsData : []
  const monthlyBills = bills.reduce(
    (sum, b) => sum + (Number(b.amount) || 0) * monthlyFactor(b.frequency),
    0
  )

  // QA fix (Aug 15 2026): flags (never blocks) likely duplicates between
  // Bills and Debts -- e.g. a mortgage tracked as a debt that also got
  // entered as a recurring bill. Bills and debt payments are summed
  // separately everywhere (including Safe-to-Spend below), so an
  // undetected duplicate here means that payment is silently counted twice.
  const billDebtOverlaps = findBillDebtOverlaps(bills, debts)

  // Admins act as the top (connected) tier so they can use/test every feature.
  const effectivePlan = profile?.is_admin ? "connected" : plan
  const canUseCharts = planCanUseCharts(effectivePlan)
  const canUseSnowball = planCanUseSnowball(effectivePlan)
  const canUseAI = planCanUseAI(effectivePlan)

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

      <div data-tour="dash-title">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Plan: <span className="text-white capitalize">{plan}</span>
        </p>
      </div>

      <AchievementsStrip />
      <BillDebtOverlapWarning overlaps={billDebtOverlaps} />
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
          <DashboardCharts debts={debts} />
        </div>

        {!canUseCharts && (
          <PaywallOverlay
            priceId="price_1TO2RmFv1EcTs6LYp5OOlvOK"
            title="Unlock Charts"
            description="Upgrade to Momentum to access charts."
          />
        )}
      </div>

      {/* SNOWBALL */}
      <div className="relative bg-[#0f172a] border border-gray-700 rounded-xl p-6 overflow-hidden">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Snowball &amp; Avalanche</h2>
          <InfoHint
            label="About Snowball & Avalanche"
            text="Compares two payoff strategies - Snowball (smallest balance first) vs Avalanche (highest interest first) - so you can see which clears your debt faster. Accelerate."
          />
        </div>

        <div className={!canUseSnowball ? "opacity-40 pointer-events-none" : ""}>
          <DebtStrategyRace plan={effectivePlan} />
        </div>

        {!canUseSnowball && (
          <PaywallOverlay
            priceId="price_1TO2SSFv1EcTs6LYVswF0AwU"
            title="Unlock Debt Strategies"
            description="Accelerate plan required."
          />
        )}
      </div>

      {/* AI */}
      <div className="relative bg-[#0f172a] border border-gray-700 rounded-xl p-6 overflow-hidden">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold">AI Insights</h2>
          <InfoHint
            label="About AI Insights"
            text="Personalized, AI-generated suggestions based on your debts and budget. Accelerate."
          />
        </div>

        <div className={!canUseAI ? "opacity-40 pointer-events-none" : ""}>
          <AIInsightPanel debts={debts} />
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