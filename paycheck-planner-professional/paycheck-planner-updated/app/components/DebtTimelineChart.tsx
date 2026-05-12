"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import { safeArray } from "@/lib/safeArray"
import { calculatePayoffTimeline, Debt } from "@/lib/financeEngine"

type Props = {
  debts?: Debt[] | null
}

export default function DebtTimelineChart({ debts }: Props) {
  const safeDebts = safeArray(debts)

  const data = calculatePayoffTimeline(safeDebts)

  if (safeDebts.length === 0 || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-semibold mb-2">Debt Payoff Timeline</h2>
        <p className="text-gray-500">Add debts to see projection</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="font-semibold mb-4">Debt Payoff Timeline</h2>

      <div className="w-full h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />

            <Line
              type="monotone"
              dataKey="remainingBalance"
              stroke="#000"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}