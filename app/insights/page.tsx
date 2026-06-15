import DebtPieChart from "@/components/charts/DebtPieChart";
import SpendingPieChart from "@/components/charts/SpendingPieChart";
import DownloadSummaryButton from "@/components/DownloadSummaryButton";

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Insights</h1>
            <p className="mt-1 text-sm text-slate-500">A visual breakdown of your money.</p>
          </div>
          <DownloadSummaryButton />
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <DebtPieChart />
          <SpendingPieChart />
        </div>
      </div>
    </div>
  );
}
