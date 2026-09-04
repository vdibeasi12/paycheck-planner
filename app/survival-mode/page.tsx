import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { computeSafeToSpend, withStartingCash } from "@/lib/safeToSpend"
import {
  classifyItemsAroundCycle,
  excludeTransferCoveredDebts,
  projectPaycheckCycles,
  toISODate,
} from "@/lib/paycheckCycles"
import { nearestWeakCycle, buildUpcomingForecast } from "@/lib/planResilience"
import { resolveStartingCash, projectAllAccountBalances, type CashAccountRow } from "@/lib/cashBalance"
import SurvivalModeView from "@/app/components/SurvivalModeView"

/**
 * "Survive until payday" -- the stripped-down view of the same
 * lib/safeToSpend.ts numbers the Dashboard's Paycheck Countdown card shows,
 * with nothing else on the page. Same data, no distractions. Ties into the
 * 30-Day Challenge content (marketing/growth plan, Aug 21) as the in-app
 * companion for anyone deliberately tightening up before a payday.
 *
 * QA fix (Sep 3 2026, Vince): this used to show one aggregate "still due
 * before payday" number with zero itemization, and always projected the
 * starting cash from "last paycheck" with no way to ground it in a real
 * balance -- both flagged as making the page feel thin/untrustworthy,
 * especially once a real bill (a mortgage) already due earlier this month
 * silently dropped out of the math with no explanation. Now: itemized
 * bills/debts (split into "already due this cycle" vs "still to come"), an
 * optional real starting-cash override (manual entry or a linked imported
 * account, see lib/cashBalance.ts), and a cross-link to Paycheck Shield
 * when a near-term paycheck is projected to come up short.
 */
export default async function SurvivalModePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [incomeRes, billsRes, debtsRes, goalsRes, cashRes] = await Promise.all([
    supabase
      .from("income")
      .select("amount, frequency, next_pay_date, income_type, cash_account_id")
      .eq("user_id", user.id),
    supabase
      .from("bills")
      .select("id, name, amount, due_date, paid_through, frequency, bimonthly_parity, cash_account_id")
      .eq("user_id", user.id),
    supabase
      .from("debts")
      .select(
        "id, name, minimum_payment, due_date, covered_by_transfer, grace_period_days, paid_through, cash_account_id"
      )
      .eq("user_id", user.id),
    supabase.from("financial_goals").select("target_amount, current_amount, deadline, status").eq("user_id", user.id),
    supabase.from("cash_accounts").select("id, kind, name, balance, balance_as_of").eq("user_id", user.id),
  ])

  const income = incomeRes.data ?? []
  const bills = billsRes.data ?? []
  const debts = debtsRes.data ?? []
  const goals = goalsRes.data ?? []
  const cashRows = (cashRes.data ?? []) as CashAccountRow[]
  const checkingRows = cashRows.filter((r) => r.kind === "checking")

  let result = computeSafeToSpend({ income, bills, debts, goals })

  const todayISO = toISODate(new Date())
  const startingCash = resolveStartingCash(checkingRows, { income, bills, debts, todayISO }, result.lastPaycheckAmount)
  result = withStartingCash(result, startingCash)

  // Debts covered_by_transfer are paid automatically from a linked transfer
  // (see lib/paycheckCycles.ts) -- left out of the "what's due" lists below
  // just like they're left out of debtsDue itself, and called out
  // separately so a mortgage/car loan doesn't just silently disappear with
  // no explanation.
  type DebtWithAmount = {
    id: string
    name: string
    amount: number
    due_date: number | null
    grace_period_days?: number | null
    paid_through?: string | null
  }
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
  let classifiedDebts: ReturnType<typeof classifyItemsAroundCycle<DebtWithAmount>> = []
  if (result.nextPaycheckDate) {
    classifiedBills = classifyItemsAroundCycle(bills, todayISO, result.nextPaycheckDate)
    classifiedDebts = classifyItemsAroundCycle(
      spendableDebts.map((d) => ({ ...d, amount: d.minimum_payment })),
      todayISO,
      result.nextPaycheckDate
    )
  }

  // Seeded with the same real starting cash used above, so this page's own
  // risk banner agrees with the Safe to Spend number it sits right next to
  // (QA fix, Sep 4 2026 -- see lib/planResilience.ts).
  const cycles = projectPaycheckCycles({ income, bills, debts, goals, startingCash: startingCash.amount })
  const risk = nearestWeakCycle(cycles)

  // "Then what" (Sep 4 2026, Vince): "if I have this much then how will I
  // be able to pay my mortgage Oct 1, car payment Sept 15, and personal
  // loan sept 22nd" -- see app/dashboard/page.tsx's identical comment (3
  // lookahead cycles, not 2, so a grace-period-shifted debt landing 3
  // paychecks out is actually shown). Same cycles/starting cash this page
  // already grounds Safe to Spend in.
  const lookahead = buildUpcomingForecast(
    cycles.slice(1, 4),
    bills,
    spendableDebts.map((d) => ({ ...d, amount: d.minimum_payment }))
  )

  // QA fix (Sep 4 2026, Vince): "checking plus savings should auto adjust"
  // -- each account's own displayed balance now auto-projects forward too
  // (see lib/cashBalance.ts's projectAccountBalance), using only what's
  // actually linked to that specific account (cash_account_id on
  // bills/debts/income). Unaffected: startingCash above (still the pooled,
  // unfiltered figure Safe to Spend/Paycheck Shield rely on).
  const projectedBalances = projectAllAccountBalances(cashRows, { income, bills, debts, todayISO })
  const accountsWithProjection = cashRows.map((a) => ({
    ...a,
    projectedBalance: projectedBalances.get(a.id) ?? Number(a.balance),
  }))

  return (
    <SurvivalModeView
      result={result}
      startingCash={startingCash}
      accounts={accountsWithProjection}
      classifiedBills={classifiedBills}
      classifiedDebts={classifiedDebts}
      coveredDebts={coveredDebts}
      risk={risk}
      lookahead={lookahead}
    />
  )
}
