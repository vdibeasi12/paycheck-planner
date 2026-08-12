import type { Metadata } from "next"
import WorksheetCaptureForm from "@/app/components/WorksheetCaptureForm"

export const metadata: Metadata = {
  title: "Free Paycheck Budget Worksheet - Paycheck Planner",
  description:
    "A free, printable worksheet that matches your bills to the exact paycheck that covers them -- the fastest fix for running out of money before payday.",
  alternates: {
    canonical: "/worksheet",
  },
}

function Row({ label }: { label: string }) {
  return (
    <div className="grid grid-cols-12 gap-2 border-b border-gray-800 py-2 text-sm">
      <div className="col-span-5 text-gray-300">{label}</div>
      <div className="col-span-3 border-b border-dashed border-gray-700" />
      <div className="col-span-2 border-b border-dashed border-gray-700" />
      <div className="col-span-2 border-b border-dashed border-gray-700" />
    </div>
  )
}

export default function WorksheetPage() {
  return (
    <div className="min-h-screen bg-[#020617] py-12 text-white print:bg-white print:text-black print:py-0">
      <div className="mx-auto max-w-3xl px-6">
        <div className="print:hidden">
          <h1 className="mb-3 text-4xl font-bold">Free Paycheck Budget Worksheet</h1>
          <p className="mb-6 text-gray-400">
            Match every bill to the exact paycheck that covers it -- the single biggest fix for
            running out of money before payday. Fill it in below, or print this page (
            <span className="text-gray-300">Ctrl/Cmd + P</span>, save as PDF) to use it by hand.
          </p>
          <div className="mb-10">
            <WorksheetCaptureForm />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-[#0f172a] p-8 print:border-0 print:bg-white print:p-0">
          <h2 className="mb-1 text-2xl font-bold print:text-black">
            This Paycheck's Budget
          </h2>
          <p className="mb-6 text-sm text-gray-400 print:text-gray-600">
            Paycheck date: ______________&nbsp;&nbsp;&nbsp; Amount: ______________
          </p>

          <h3 className="mb-2 mt-6 font-semibold text-emerald-400 print:text-black">
            1. Bills due before your next paycheck
          </h3>
          <div className="grid grid-cols-12 gap-2 pb-1 text-xs font-medium text-gray-500 print:text-gray-500">
            <div className="col-span-5">Bill</div>
            <div className="col-span-3">Amount</div>
            <div className="col-span-2">Due date</div>
            <div className="col-span-2">Paid</div>
          </div>
          <Row label="Rent / mortgage" />
          <Row label="Utilities" />
          <Row label="Phone" />
          <Row label="Minimum debt payments" />
          <Row label="_______________" />
          <Row label="_______________" />
          <Row label="_______________" />

          <h3 className="mb-2 mt-8 font-semibold text-emerald-400 print:text-black">
            2. What's left for groceries, gas, and everything else
          </h3>
          <p className="text-sm text-gray-400 print:text-gray-600">
            Paycheck amount &minus; total bills above = ______________
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-emerald-400 print:text-black">
            3. Savings from this paycheck
          </h3>
          <p className="text-sm text-gray-400 print:text-gray-600">
            Even $10-20 counts. Move it the day the paycheck lands: ______________
          </p>

          <h3 className="mb-2 mt-8 font-semibold text-emerald-400 print:text-black">
            4. Buffer tracker
          </h3>
          <p className="text-sm text-gray-400 print:text-gray-600">
            Goal: build one extra paycheck of cushion in checking, so a bill that lands early
            never causes an overdraft. Current buffer: ______________ / one paycheck
          </p>
        </div>

        <div className="mt-10 print:hidden">
          <WorksheetCaptureForm />
        </div>
      </div>
    </div>
  )
}
