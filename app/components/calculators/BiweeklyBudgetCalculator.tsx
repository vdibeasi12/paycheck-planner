"use client"

import { useState, useMemo } from "react"

function money(n: number): string {
  if (!isFinite(n)) return "--"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function findThreePaycheckMonths(firstPaycheckIso: string): number[] {
  if (!firstPaycheckIso) return []
  const start = new Date(firstPaycheckIso + "T00:00:00")
  if (isNaN(start.getTime())) return []

  const counts = new Array(12).fill(0)
  const cursor = new Date(start)
  // Walk a full year of biweekly paychecks (accounting for a possible
  // partial year before/after) and tally how many land in each month.
  cursor.setDate(cursor.getDate() - 14 * 3) // step back a few cycles so partial months at the start are counted too
  for (let i = 0; i < 30; i++) {
    if (cursor.getFullYear() === start.getFullYear()) {
      counts[cursor.getMonth()]++
    }
    cursor.setDate(cursor.getDate() + 14)
  }
  return counts
    .map((c, idx) => (c >= 3 ? idx : -1))
    .filter((idx) => idx >= 0)
}

export default function BiweeklyBudgetCalculator() {
  const [paycheck, setPaycheck] = useState("")
  const [monthlyBills, setMonthlyBills] = useState("")
  const [firstPaycheckDate, setFirstPaycheckDate] = useState("")

  const paycheckNum = parseFloat(paycheck) || 0
  const billsNum = parseFloat(monthlyBills) || 0
  const annualBills = billsNum * 12
  const perPaycheckForBills = annualBills / 26
  const leftover = paycheckNum - perPaycheckForBills

  const threePaycheckMonths = useMemo(
    () => findThreePaycheckMonths(firstPaycheckDate),
    [firstPaycheckDate]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Amount per biweekly paycheck</span>
            <input
              type="number"
              min="0"
              value={paycheck}
              onChange={(e) => setPaycheck(e.target.value)}
              placeholder="1500"
              className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Total recurring bills per month</span>
            <input
              type="number"
              min="0"
              value={monthlyBills}
              onChange={(e) => setMonthlyBills(e.target.value)}
              placeholder="2400"
              className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm text-gray-300">
              Date of an upcoming paycheck (to find your 3-paycheck months)
            </span>
            <input
              type="date"
              value={firstPaycheckDate}
              onChange={(e) => setFirstPaycheckDate(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <p className="text-sm text-gray-300">Set aside per paycheck for bills</p>
        <p className="text-4xl font-bold text-white">{money(perPaycheckForBills)}</p>
        <p className="mt-2 text-sm text-gray-400">
          Leftover per paycheck after bills: {money(leftover)}
        </p>
      </div>

      {threePaycheckMonths.length > 0 && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-6">
          <p className="text-sm font-semibold text-white">
            3-paycheck months this year: {threePaycheckMonths.map((m) => MONTH_NAMES[m]).join(", ")}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Since bills are budgeted using the 26-paycheck average, that extra paycheck in these
            months is real leftover money -- a good target for extra debt payoff or savings.
          </p>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Budgeting bills against the 26-paycheck annual average (rather than 24, which assumes
        exactly 2 paychecks every month) is what surfaces the 3-paycheck months instead of hiding
        them.
      </p>
    </div>
  )
}
