import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { computeSafeToSpend, withStartingCash } from "@/lib/safeToSpend"
import {
  classifyItemsAroundCycle,
  excludeTransferCoveredDebts,
  projectPaycheckCycles,
  toISODate,
} from "@/lib/paycheckCycles"
import { nearestWeakCycle } from "@/lib/planResilience"
import { resolveStartingCash, type CashAccountRow } from "@/lib/cashBalance"
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
    supabase.from("income").select("amount, frequency, next_pay_date, income_type").eq("user_id", user.id),
    supabase.from("bills").select("id, name, amount, due_date").eq("user_id", user.id),
    supabase.from("debts").select("id, name, minimum_payment, due_date, covered_by_transfer").eq("user_id", user.id),
    supabase.from("financial_goals").select("target_amount, current_amount, deadline, status").eq("user_id", user.id),
    supabase.from("cash_accounts").select("kind, balance, balance_as_of").eq("user_id", user.id),
  ])

  const income = incomeRes.data ?? []
  const bills = billsRes.data ?? []
  const debts = debtsRes.data ?? []
  const goals = goalsRes.data ?? []
  const cashRows = (cashRes.data ?? []) as CashAccountRow[]
  const checkingRow = cashRows.find((r) => r.kind === "checking") ?? null
  const savingsRow = cashRows.find((r) => r.kind === "savings") ?? null

  let result = computeSafeToSpend({ income, bills, debts, goals })

  const todayISO = toISODate(new Date())
  const startingCash = resolveStartingCash(checkingRow, { income, bills, debts, todayISO }, result.lastPaycheckAmount)
  result = withStartingCash(result, startingCash)

  // Debts covered_by_transfer are paid automatically from a linked transfer
  // (see lib/paycheckCycles.ts) -- left out of the "what's due" lists below
  // just like they're left out of debtsDue itself, and called out
  // separately so a mortgage/car loan doesn't just silently disappear with
  // no explanation.
  type DebtWithAmount = { id: string; name: string; amount: number; due_date: number | null }
  const spendableDebts = excludeTransferCoveredDebts(debts)
  const coveredDebts = debts
    .filter((d) => d.covered_by_transfer)
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

  const cycles = projectPaycheckCycles({ income, bills, debts, goals })
  const risk = nearestWeakCycle(cycles)

  return (
    <SurvivalModeView
      result={result}
      startingCash={startingCash}
      savings={savingsRow}
      classifiedBills={classifiedBills}
      classifiedDebts={classifiedDebts}
      coveredDebts={coveredDebts}
      risk={risk}
    />
  )
}
