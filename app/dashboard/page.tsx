import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

import SummaryCards from "@/app/components/SummaryCards"
import DebtList from "@/app/components/DebtList"
import DebtStrategyRace from "@/app/components/DebtStrategyRace"
import PaywallOverlay from "@/app/components/PaywallOverlay"
import InfoHint from "@/app/components/InfoHint"
import PaycheckCountdown from "@/app/components/PaycheckCountdown"
import WhatIfSpend from "@/app/components/WhatIfSpend"
import PaycheckSurplusPrompt from "@/app/components/PaycheckSurplusPrompt"
import { computeSafeToSpend, withStartingCash } from "@/lib/safeToSpend"
import { detectClosedCycleSurplus } from "@/lib/paycheckSurplus"
import { detectStartingCycleSnapshot } from "@/lib/planDrift"
import {
  classifyItemsAroundCycle,
  excludeTransferCoveredDebts,
  projectPaycheckCycles,
  toISODate,
} from "@/lib/paycheckCycles"
import { nearestWeakCycle, buildUpcomingForecast } from "@/lib/planResilience"
import { resolveStartingCash, type CashAccountRow } from "@/lib/cashBalance"
import { computeCapacityForCycles, generatePaycheckTalk } from "@/lib/paycheckCapacity"
import PaycheckTalkCard from "@/app/components/PaycheckTalkCard"
import AchievementsStrip from "@/app/components/AchievementsStrip"
import ReferralCard from "@/app/components/ReferralCard"
import PaywallCard from "@/app/components/PaywallCard"
import { canUseCharts as planCanUseCharts, canUseSnowball as planCanUseSnowball, canUseAI as planCanUseAI } from "@/lib/permissions"
import DashboardCharts from "@/app/components/DashboardCharts"
import AIInsightPanel from "@/app/components/AIInsightPanel"
import { maybeSendWelcomeEmail } from "@/lib/sendWelcomeEmail"
import { monthlyFactor } from "@/lib/monthlyFactor"
import { findBillDebtOverlaps } from "@/lib/billDebtOverlap"
import BillDebtOverlapWarning from "@/app/components/BillDebtOverlapWarning"
import { bumpActivityStreak } from "@/lib/activityStreak"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Best-effort last-seen timestamp for the inactivity push trigger
  // (app/api/cron/inactivity-nudge), plus the "On a Roll"/"Streak Master"
  // activity streak bump (lib/activityStreak.ts). Not awaited -- a dashboard
  // load shouldn't wait on either, and a failure in one shouldn't break the
  // other or the page.
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
  void bumpActivityStreak(supabase, user.id)

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

  // QA fix (Aug 18 2026): "Debt Progress" below was hardcoded to 0 -- it
  // never actually computed anything. original_balance is set once when a
  // debt is created (and never overwritten by later edits or bank syncs,
  // see app/debts/page.tsx / lib/plaid.ts), so today's balance vs that
  // starting point is real progress. Only debts that have original_balance
  // tracked are counted, on both sides of the ratio -- older debts from
  // before this field existed are left out entirely rather than silently
  // treated as 0% progress, which would understate this number for anyone
  // with a mix of old and new debts. Uses every debt, not just ones still
  // owed, so a fully paid-off debt (balance 0) correctly contributes 100%
  // and this hits 100% once you're debt-free, matching the card's own
  // hint text. Clamped to 0-100% for this single glanceable stat -- see
  // /analytics for the fuller per-debt picture, including a debt whose
  // balance grew.
  const debtsWithOriginal = debts.filter(
    (d) => d.original_balance != null && Number(d.original_balance) > 0
  )
  const originalDebtTotal = debtsWithOriginal.reduce(
    (sum, d) => sum + (Number(d.original_balance) || 0),
    0
  )
  const paidDownTotal = debtsWithOriginal.reduce(
    (sum, d) => sum + ((Number(d.original_balance) || 0) - (Number(d.balance) || 0)),
    0
  )
  const percentPaid =
    originalDebtTotal > 0 ? Math.max(0, Math.min(100, (paidDownTotal / originalDebtTotal) * 100)) : 0

  const { data: incomeData } = await supabase
    .from("income")
    .select("amount, frequency, income_type, next_pay_date")
    .eq("user_id", user.id)
  const income = Array.isArray(incomeData) ? incomeData : []
  // "transfer" rows are money moving between the user's own accounts (e.g. a
  // CSV-detected "Transfer from Chime Checking Account"), not real income.
  // lib/safeToSpend.ts applies this same exclusion internally, so it's not
  // re-filtered here -- the raw `income` array (with next_pay_date) is
  // passed straight into computeSafeToSpend below.

  const { data: billsData } = await supabase
    .from("bills")
    .select("id, name, amount, frequency, due_date, paid_through, bimonthly_parity")
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

  // id/title added (Aug 26 2026, Paycheck Surplus) so the surplus prompt's
  // goal picker doesn't need a second query -- every other read of `goals`
  // below only ever used the four original columns, so this is additive.
  const { data: goalsData } = await supabase
    .from("financial_goals")
    .select("id, title, target_amount, current_amount, deadline, status")
    .eq("user_id", user.id)
  const goals = Array.isArray(goalsData) ? goalsData : []

  // Paycheck-cycle Safe-to-Spend (lib/safeToSpend.ts) -- replaces the old
  // flat "this calendar month" version. Same debts/income already fetched
  // above; bills/income just needed due_date/next_pay_date added to their
  // selects.
  let safeToSpendResult = computeSafeToSpend({ income, bills, debts, goals })

  // QA fix (Sep 3 2026, Vince): "$1,631.37 safe to spend, but my mortgage is
  // due this month" -- the math was right (the mortgage's due day had
  // already passed this month, so it's assumed already paid from the PRIOR
  // paycheck), but the number was still just a projection off "last
  // paycheck," not real money. Ground it in the user's real Checking
  // balance when they've entered one (see lib/cashBalance.ts) -- projected
  // forward from whenever it was accurate using the same income/bills/debts
  // already on file, so it doesn't go stale -- falling back to the original
  // projection when they haven't entered one yet.
  const todayISOForCash = toISODate(new Date())
  const { data: cashRowsData } = await supabase
    .from("cash_accounts")
    .select("id, kind, name, balance, balance_as_of")
    .eq("user_id", user.id)
  const cashRows = (cashRowsData ?? []) as CashAccountRow[]
  const checkingRows = cashRows.filter((r) => r.kind === "checking")
  const startingCash = resolveStartingCash(
    checkingRows,
    { income, bills, debts, todayISO: todayISOForCash },
    safeToSpendResult.lastPaycheckAmount
  )
  safeToSpendResult = withStartingCash(safeToSpendResult, startingCash)

  // Same "why isn't my mortgage counted" transparency as Survival Mode --
  // splits bills/debts into "still to come before payday" (what's actually
  // subtracted above) vs "already due earlier this cycle" (assumed already
  // paid, so excluded) instead of letting a big bill just silently vanish.
  // Debts marked covered_by_transfer (paid automatically from a linked
  // transfer -- see lib/paycheckCycles.ts) are left out of this list
  // entirely, same as they're left out of billsDue/debtsDue above: they're
  // not part of what this paycheck covers.
  const spendableDebts = excludeTransferCoveredDebts(debts, income)
  // Only show a debt as "covered by transfer" here if it's ACTUALLY excluded
  // above -- covered_by_transfer alone is no longer trusted without a real
  // transfer on record (see excludeTransferCoveredDebts), so this list must
  // agree with spendableDebts instead of re-reading the raw flag on its own.
  const spendableDebtIds = new Set(spendableDebts.map((d) => d.id))
  const coveredDebts = debts
    .filter((d) => d.covered_by_transfer && !spendableDebtIds.has(d.id))
    .map((d) => ({ name: d.name, amount: Number(d.minimum_payment) || 0 }))
  let classifiedBills: ReturnType<typeof classifyItemsAroundCycle<typeof bills[number]>> = []
  let classifiedDebts: ReturnType<typeof classifyItemsAroundCycle<typeof debts[number]>> = []
  if (safeToSpendResult.nextPaycheckDate) {
    const todayISO = toISODate(new Date())
    classifiedBills = classifyItemsAroundCycle(bills, todayISO, safeToSpendResult.nextPaycheckDate)
    classifiedDebts = classifyItemsAroundCycle(
      spendableDebts.map((d) => ({ ...d, amount: d.minimum_payment })),
      todayISO,
      safeToSpendResult.nextPaycheckDate
    )
  }

  // Paycheck Capacity / "If This Paycheck Could Talk" (Aug 26 2026): reuses
  // the same projected cycles Paycheck Shield already computes -- no new
  // table, nothing persisted. Compares the soonest upcoming paycheck against
  // the one after it and, when the gap is real, recommends which one should
  // absorb an optional extra payment. Null when there's no projectable plan
  // yet (no income/pay date), same condition safeToSpendResult and the
  // Surplus/Drift detectors below already handle gracefully.
  // Seeded with the same real starting cash Safe to Spend above already
  // grounds itself in (see lib/cashBalance.ts), so nearTermRisk below
  // agrees with the Safe to Spend number instead of judging every cycle as
  // if it started from zero (QA fix, Sep 4 2026 -- see lib/planResilience.ts).
  const upcomingCycles = projectPaycheckCycles({ income, bills, debts, goals, startingCash: startingCash.amount })
  const paycheckTalk = generatePaycheckTalk(computeCapacityForCycles(upcomingCycles))

  // Cross-links Paycheck Shield's own projection right here -- Safe to
  // Spend only ever looks at the very next paycheck, so a bill landing two
  // paychecks out (a mortgage, say) can leave this card looking calm while
  // Paycheck Shield already knows that later cycle is in trouble.
  const nearTermRisk = nearestWeakCycle(upcomingCycles)

  // "Then what" (Sep 4 2026, Vince): "if I have this much then how will I
  // be able to pay my mortgage Oct 1, car payment Sept 15, and personal
  // loan sept 22nd" -- names the bills/debts landing in each of the next
  // few REAL paychecks after this one (upcomingCycles[0] is the one Safe to
  // Spend above already covers) and whether the running balance still
  // covers them. 3 lookahead cycles, not 2 -- a debt with a real grace
  // period (the mortgage itself, nominally due the 1st but not effectively
  // due until the 16th) can land a full 3 paychecks out, past where a
  // shorter window would ever show it. Same cycles/starting cash as
  // everything else on this page, so it can't disagree with Safe to Spend
  // or Paycheck Shield.
  const lookahead = buildUpcomingForecast(
    upcomingCycles.slice(1, 4),
    bills,
    spendableDebts.map((d) => ({ ...d, amount: d.minimum_payment }))
  )

  // Paycheck Surplus (Aug 26 2026): if a cycle just closed with money still
  // left in it (per the same Safe-to-Spend math above), record one decision
  // row for it -- upsert with ignoreDuplicates so this is a no-op on every
  // dashboard load after the first for that cycle, whether or not the user
  // has already resolved it. Best-effort: a failure here shouldn't break the
  // dashboard.
  const surplusDetection = detectClosedCycleSurplus({ income, bills, debts, goals })
  if (surplusDetection) {
    await supabase
      .from("paycheck_surplus_decisions")
      .upsert(
        {
          user_id: user.id,
          cycle_date: surplusDetection.cycleDate,
          surplus_amount: surplusDetection.surplusAmount,
        },
        { onConflict: "user_id,cycle_date", ignoreDuplicates: true }
      )
  }

  const { data: pendingSurplus } = await supabase
    .from("paycheck_surplus_decisions")
    .select("id, cycle_date, surplus_amount")
    .eq("user_id", user.id)
    .eq("resolved", false)
    .order("cycle_date", { ascending: false })
    .limit(1)
    .maybeSingle()

  // Plan Drift (Aug 26 2026): if a cycle just STARTED (the opposite moment
  // from Surplus above), freeze its computed breakdown as the "original
  // plan" before the user has a chance to edit anything. Same
  // upsert-with-ignoreDuplicates pattern -- a no-op on every load after the
  // first for that cycle. The /plan-drift page reads this back and
  // recomputes the live version to diff against it.
  const driftSnapshot = detectStartingCycleSnapshot({ income, bills, debts, goals })
  if (driftSnapshot) {
    await supabase
      .from("paycheck_plan_snapshots")
      .upsert(
        {
          user_id: user.id,
          cycle_date: driftSnapshot.cycleDate,
          amount: driftSnapshot.amount,
          bills_amount: driftSnapshot.billsAmount,
          debts_amount: driftSnapshot.debtsAmount,
          goals_amount: driftSnapshot.goalsAmount,
          flexible_amount: driftSnapshot.flexibleAmount,
        },
        { onConflict: "user_id,cycle_date", ignoreDuplicates: true }
      )
  }

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
      {pendingSurplus && (
        <PaycheckSurplusPrompt
          decisionId={pendingSurplus.id}
          cycleDate={pendingSurplus.cycle_date}
          surplusAmount={Number(pendingSurplus.surplus_amount) || 0}
          debts={debts.map((d) => ({ id: d.id, name: d.name }))}
          goals={goals.map((g) => ({ id: g.id, title: g.title }))}
        />
      )}
      <PaycheckCountdown
        result={safeToSpendResult}
        startingCash={startingCash}
        classifiedBills={classifiedBills}
        classifiedDebts={classifiedDebts}
        coveredDebts={coveredDebts}
        risk={nearTermRisk}
        lookahead={lookahead}
      />
      <WhatIfSpend result={safeToSpendResult} />
      {paycheckTalk && <PaycheckTalkCard narrative={paycheckTalk} />}
      <SummaryCards netWorth={-totalDebt} totalDebt={totalDebt} monthlyPayments={monthlyPayments} percentPaid={percentPaid} />
      <DebtList debts={debts} />

      {/* Real, usage-tied upgrade prompt (Aug 29 2026): PaywallCard already
          existed fully built but was never mounted anywhere, so the only
          way a free user ever saw pricing was by hitting a blurred
          Charts/Snowball/AI panel further down the page. Once someone has
          actually added debt -- the moment the interest they're paying is a
          real number, not a hypothetical -- show them what upgrading gets
          them, right here instead of only behind the paywalled panels. */}
      {effectivePlan === "free" && debts.length > 0 && (
        <PaywallCard user={user} debts={debts} />
      )}

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

      {/* Referrals moved to the bottom of the page (Vince, Aug 27 2026) --
          it used to sit between the summary cards and the debt list, which
          broke up the "here's where you stand" flow with a share prompt
          before the user had even seen their own numbers. It's still on
          every dashboard load, just after everything else. */}
      <ReferralCard userId={user.id} />

    </div>
  )
}