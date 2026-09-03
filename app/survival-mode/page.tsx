import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { computeSafeToSpend, withStartingCash } from "@/lib/safeToSpend"
import { classifyItemsAroundCycle, projectPaycheckCycles, toISODate } from "@/lib/paycheckCycles"
import { nearestWeakCycle } from "@/lib/planResilience"
import { resolveStartingCash, resolveAccountBalance, type CashAccountRow } from "@/lib/cashBalance"
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
    supabase.from("debts").select("id, name, minimum_payment, due_date").eq("user_id", user.id),
    supabase.from("financial_goals").select("target_amount, current_amount, deadline, status").eq("user_id", user.id),
    supabase
      .from("cash_accounts")
      .select("id, label, manual_balance, manual_balance_updated_at, linked_account_label, linked_starting_balance")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
  ])

  const income = incomeRes.data ?? []
  const bills = billsRes.data ?? []
  const debts = debtsRes.data ?? []
  const goals = goalsRes.data ?? []
  const cashRows = (cashRes.data ?? []) as CashAccountRow[]

  let result = computeSafeToSpend({ income, bills, debts, goals })

  const resolvedAccounts = await Promise.all(
    cashRows.map(async (row) => {
      let linkedSum: number | null = null
      if (row.linked_account_label) {
        const { data: txns } = await supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("account_label", row.linked_account_label)
        linkedSum = (txns ?? []).reduce((sum, t) => sum + Number(t.amount || 0), 0)
      }
      return resolveAccountBalance(row, linkedSum)
    })
  )
  const startingCash = resolveStartingCash(resolvedAccounts, result.lastPaycheckAmount)
  result = withStartingCash(result, startingCash)

  type DebtWithAmount = { id: string; name: string; amount: number; due_date: number | null }
  let classifiedBills: ReturnType<typeof classifyItemsAroundCycle<typeof bills[number]>> = []
  let classifiedDebts: ReturnType<typeof classifyItemsAroundCycle<DebtWithAmount>> = []
  if (result.nextPaycheckDate) {
    const todayISO = toISODate(new Date())
    classifiedBills = classifyItemsAroundCycle(bills, todayISO, result.nextPaycheckDate)
    classifiedDebts = classifyItemsAroundCycle(
      debts.map((d) => ({ ...d, amount: d.minimum_payment })),
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
      classifiedBills={classifiedBills}
      classifiedDebts={classifiedDebts}
      risk={risk}
    />
  )
}
