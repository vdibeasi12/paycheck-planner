import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import DebtPieChart from "@/components/charts/DebtPieChart"
import SpendingPieChart from "@/components/charts/SpendingPieChart"
import DownloadSummaryButton from "@/components/DownloadSummaryButton"
import FinancialOverviewSection from "@/app/components/FinancialOverviewSection"

export default async function InsightsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Same fields, same filters as app/dashboard/page.tsx -- the whole point
  // of lib/financialOverview.ts is that this page and the Dashboard can
  // never quietly disagree with each other.
  const [{ data: incomeData }, { data: billsData }, { data: debtsData }] = await Promise.all([
    supabase.from("income").select("amount, frequency, income_type").eq("user_id", user.id),
    supabase.from("bills").select("amount, frequency, category").eq("user_id", user.id),
    supabase.from("debts").select("balance, minimum_payment, escrow_payment").eq("user_id", user.id),
  ])

  const income = Array.isArray(incomeData) ? incomeData : []
  const bills = Array.isArray(billsData) ? billsData : []
  const debts = Array.isArray(debtsData) ? debtsData : []

  return (
    <div className="min-h-screen bg-[#020617] p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Insights</h1>
            <p className="mt-1 text-sm text-gray-400">A clear breakdown of your money.</p>
          </div>
          <DownloadSummaryButton />
        </div>

        <div className="mt-6">
          <FinancialOverviewSection income={income} bills={bills} debts={debts} />
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <DebtPieChart />
          <SpendingPieChart />
        </div>
      </div>
    </div>
  )
}
