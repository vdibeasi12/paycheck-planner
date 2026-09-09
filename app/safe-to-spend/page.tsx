import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PiggyBank } from "lucide-react"

import PaycheckCountdown from "@/app/components/PaycheckCountdown"
import MonthlySafeToSpendCard from "@/app/components/MonthlySafeToSpendCard"
import ExtraDebtPaymentCard from "@/app/components/ExtraDebtPaymentCard"
import { computeSafeToSpend, withStartingCash } from "@/lib/safeToSpend"
import { computeMonthlySafeToSpend } from "@/lib/monthlySafeToSpend"
import { computeDebtPayoffAffordability } from "@/lib/debtPayoffSafety"
import {
  classifyItemsAroundCycle,
  excludeTransferCoveredDebts,
  toISODate,
} from "@/lib/paycheckCycles"
import { resolveStartingCash, type CashAccountRow } from "@/lib/cashBalance"

// app/safe-to-spend/page.tsx
// Sep 9 2026, Vince: "create a new section for safe to spend so it's not
// buried in several different places... calculate your monthly finances...
// so you know what you have to spend, not paycheck to paycheck." This is
// that consolidated page -- the one canonical place for both:
//   1. "This paycheck cycle" -- the existing, frozen lib/safeToSpend.ts
//      engine (Dashboard/Survival Mode), kept exactly as-is; it answers a
//      real, different question ("is this cycle covered") from the one below.
//   2. "This month" / "Extra debt payment" -- the new monthly rollup
//      (lib/monthlySafeToSpend.ts) plus the existing "Can I pay this off?"
//      engine (lib/debtPayoffSafety.ts), both built on the same shared
//      primitives so none of the three numbers on this page can quietly
//      disagree with each other or with what's shown elsewhere in the app.
//
// Data-fetching below is deliberately identical to app/dashboard/page.tsx's
// Safe-to-Spend section (same tables, same columns, same
// resolveStartingCash call) -- this page and the Dashboard must never read
// a different starting balance for the same user.
export default async function SafeToSpendPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const { data: incomeData } = await supabase
    .from("income")
    .select("amount, frequency, income_type, next_pay_date")
    .eq("user_id", user.id)
  const income = Array.isArray(incomeData) ? incomeData : []

  const { data: billsData } = await supabase
    .from("bills")
    .select("id, name, amount, frequency, due_date, paid_through, bimonthly_parity")
    .eq("user_id", user.id)
  const bills = Array.isArray(billsData) ? billsData : []

  const { data: debtsData } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", user.id)
  const debts = Array.isArray(debtsData) ? debtsData : []

  const { data: goalsData } = await supabase
    .from("financial_goals")
    .select("id, title, target_amount, current_amount, deadline, status")
    .eq("user_id", user.id)
  const goals = Array.isArray(goalsData) ? goalsData : []

  const todayISO = toISODate(new Date())
  const { data: cashRowsData } = await supabase
    .from("cash_accounts")
    .select("id, kind, name, balance, balance_as_of")
    .eq("user_id", user.id)
  const cashRows = (cashRowsData ?? []) as CashAccountRow[]
  const checkingRows = cashRows.filter((r) => r.kind === "checking")

  // 1. This paycheck cycle -- frozen engine, untouched.
  let safeToSpendResult = computeSafeToSpend({ income, bills, debts, goals })
  const startingCash = resolveStartingCash(
    checkingRows,
    { income, bills, debts, todayISO },
    safeToSpendResult.lastPaycheckAmount
  )
  safeToSpendResult = withStartingCash(safeToSpendResult, startingCash)

  const spendableDebts = excludeTransferCoveredDebts(debts, income)
  const spendableDebtIds = new Set(spendableDebts.map((d) => d.id))
  const coveredDebts = debts
    .filter((d) => d.covered_by_transfer && !spendableDebtIds.has(d.id))
    .map((d) => ({ name: d.name, amount: Number(d.minimum_payment) || 0 }))

  let classifiedBills: ReturnType<typeof classifyItemsAroundCycle<typeof bills[number]>> = []
  let classifiedDebts: ReturnType<typeof classifyItemsAroundCycle<typeof debts[number]>> = []
  if (safeToSpendResult.nextPaycheckDate) {
    classifiedBills = classifyItemsAroundCycle(bills, todayISO, safeToSpendResult.nextPaycheckDate, safeToSpendResult.lastPaycheckDate)
    classifiedDebts = classifyItemsAroundCycle(
      spendableDebts.map((d) => ({ ...d, amount: d.minimum_payment })),
      todayISO,
      safeToSpendResult.nextPaycheckDate,
      safeToSpendResult.lastPaycheckDate
    )
  }

  // 2. This month -- income-based rollup (Sep 9 2026, Vince: compared this
  // against Voya's public budget calculator and asked for the arithmetic to
  // match it -- monthlyIncome minus committed money, not currentBalance,
  // so the number stays steady no matter what day of the month it's checked;
  // see lib/monthlySafeToSpend.ts for the full writeup).
  const monthlyResult = computeMonthlySafeToSpend({
    income,
    bills,
    debts,
    goals,
  })

  // 3. Extra debt payment -- same call convention as the existing "Can I pay
  // this off?" widget on Bills & Debts (app/components/DebtPayoffAffordability.tsx):
  // transfer-covered debts excluded first, goals passed as [] (matches that
  // widget's own established behavior -- not a new decision made here, see
  // that file). Kept identical on purpose so this card is never a fourth,
  // subtly-different number.
  const payoffCandidates = excludeTransferCoveredDebts(debts, income).map((d) => ({
    minimum_payment: d.minimum_payment,
    due_date: d.due_date,
    grace_period_days: d.grace_period_days,
    paid_through: d.paid_through,
  }))
  const affordability = computeDebtPayoffAffordability({
    startingCash: startingCash.amount,
    income,
    bills,
    debts: payoffCandidates,
    goals: [],
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2.5">
        <PiggyBank size={24} className="text-emerald-400" />
        <h1 className="text-2xl font-bold text-primary">Safe to Spend</h1>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Two different, both-correct answers to "how much do I actually have": what's safe until your next
        paycheck, and what's left this month once everything committed is set aside -- plus how much extra you
        could safely put toward debt right now.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PaycheckCountdown
          result={safeToSpendResult}
          startingCash={startingCash}
          classifiedBills={classifiedBills}
          classifiedDebts={classifiedDebts}
          coveredDebts={coveredDebts}
        />
        <div className="space-y-6">
          <MonthlySafeToSpendCard result={monthlyResult} />
          <ExtraDebtPaymentCard affordability={affordability} />
        </div>
      </div>
    </div>
  )
}
