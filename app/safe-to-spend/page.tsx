import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PiggyBank } from "lucide-react"

import PaycheckCountdown from "@/app/components/PaycheckCountdown"
import MonthlySafeToSpendCard from "@/app/components/MonthlySafeToSpendCard"
import ExtraDebtPaymentCard from "@/app/components/ExtraDebtPaymentCard"
import MonthlyDebtCapacityCard from "@/app/components/MonthlyDebtCapacityCard"
import { computeSafeToSpend, withStartingCash } from "@/lib/safeToSpend"
import { computeMonthlySafeToSpend } from "@/lib/monthlySafeToSpend"
import { computeMonthlyDebtCapacity } from "@/lib/monthlyDebtCapacity"
import { computeDebtPayoffAffordability } from "@/lib/debtPayoffSafety"
import {
  classifyItemsAroundCycle,
  excludeTransferCoveredDebts,
  toISODate,
} from "@/lib/paycheckCycles"
import { resolveStartingCash, savingsAccountIdsOf, type CashAccountRow } from "@/lib/cashBalance"
import { computeAccountSplitSafeToSpend } from "@/lib/accountSafeToSpend"

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
    .select("amount, frequency, income_type, next_pay_date, cash_account_id")
    .eq("user_id", user.id)
  const income = Array.isArray(incomeData) ? incomeData : []

  const { data: billsData } = await supabase
    .from("bills")
    .select("id, name, amount, frequency, due_date, paid_through, bimonthly_parity, cash_account_id")
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
  // Sep 11 2026, Vince: "stop counting the savings in Chime, that is for
  // emergency money only... it's not to be used to pay bills or debt."
  // Anything linked to a savings account is kept out of every spendable
  // figure -- see resolveStartingCash in lib/cashBalance.ts.
  const savingsAccountIds = savingsAccountIdsOf(cashRows)

  // 1. Safe to Spend -- real balance minus everything due through the end of
  // this calendar month (see lib/safeToSpend.ts's Sep 9 2026 fix).
  let safeToSpendResult = computeSafeToSpend({ income, bills, debts, goals })
  const startingCash = resolveStartingCash(
    checkingRows,
    { income, bills, debts, todayISO, savingsAccountIds },
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
  if (safeToSpendResult.windowEndDate) {
    classifiedBills = classifyItemsAroundCycle(bills, todayISO, safeToSpendResult.windowEndDate, safeToSpendResult.lastPaycheckDate)
    classifiedDebts = classifyItemsAroundCycle(
      spendableDebts.map((d) => ({ ...d, amount: d.minimum_payment })),
      todayISO,
      safeToSpendResult.windowEndDate,
      safeToSpendResult.lastPaycheckDate,
      { extendForNextOccurrence: true }
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
    startingCashAsOf: startingCash.asOf,
    income,
    bills,
    debts: payoffCandidates,
    goals: [],
  })

  // Sep 10 2026, Vince: "show what you can safely pay extra towards debt per
  // month basis." The recurring counterpart to affordability's one-time lump
  // sum -- see lib/monthlyDebtCapacity.ts. Uses the full debt rows (not
  // payoffCandidates) because it needs each debt's own frequency/name for the
  // monthly rollup, and does its own transfer-covered filtering.
  const monthlyCapacity = computeMonthlyDebtCapacity({
    startingCash: startingCash.amount,
    startingCashAsOf: startingCash.asOf,
    income,
    bills,
    debts,
  })

  // Per-account split (Sep 9 2026, Vince): "53rd only gets $1660 per
  // paycheck to save and pay [mortgage/car/personal loan]... Chime gets the
  // rest to pay utilities and credit cards. If I spend all that [pooled]
  // money I will not have enough for the car payment [and] personal loan."
  // Only activates when the user has actually linked bills/debts/income to
  // 2+ checking accounts (see lib/accountSafeToSpend.ts) -- everyone else
  // keeps seeing the exact pooled cards above, untouched.
  const split = computeAccountSplitSafeToSpend({
    checkingAccounts: checkingRows,
    income,
    bills,
    debts,
    goals,
    todayISO,
    savingsAccountIds,
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2.5">
        <PiggyBank size={24} className="text-emerald-400" />
        <h1 className="text-2xl font-bold text-primary">Safe to Spend</h1>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Two different, both-correct answers to "how much do I actually have," both covering the rest of this
        calendar month: what's safe to spend from your real balance once every bill and debt due this month is
        set aside, and what's left over based on your average monthly income -- plus how much extra you could
        safely put toward debt right now.
      </p>

      {split.isSplit ? (
        <div className="space-y-10">
          <p className="-mt-4 max-w-2xl text-sm text-muted">
            You've linked bills, debts, or paychecks to more than one checking account, so these are split by
            account -- money reserved for one account's bills is never counted as safe to spend out of another.
          </p>
          {split.accounts.map(({ account, cycle, monthly, affordability: accountAffordability, monthlyDebtCapacity: accountMonthlyCapacity, classifiedBills: accountBills, classifiedDebts: accountDebts, coveredDebts: accountCovered }) => (
            <div key={account.id}>
              <h2 className="mb-3 text-lg font-semibold text-primary">{account.name}</h2>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <PaycheckCountdown
                  result={cycle}
                  startingCash={{ amount: cycle.startingCash, source: cycle.startingCashSource, asOf: cycle.startingCashAsOf }}
                  classifiedBills={accountBills}
                  classifiedDebts={accountDebts}
                  coveredDebts={accountCovered}
                />
                <div className="space-y-6">
                  <MonthlySafeToSpendCard result={monthly} />
                  <ExtraDebtPaymentCard affordability={accountAffordability} />
                  <MonthlyDebtCapacityCard capacity={accountMonthlyCapacity} />
                </div>
              </div>
            </div>
          ))}
          {(split.unassignedBillsTotal > 0 || split.unassignedDebtsTotal > 0) && (
            <p className="max-w-2xl text-xs text-muted">
              Not tied to a specific account above, so not part of either account's numbers: bills/debts without
              an account assigned in Bills &amp; Debts. Assign an account to each one to have it counted.
            </p>
          )}
        </div>
      ) : (
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
            <MonthlyDebtCapacityCard capacity={monthlyCapacity} />
          </div>
        </div>
      )}
    </div>
  )
}
