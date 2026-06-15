"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"

import { calculatePayoffTimeline, Debt } from "@/lib/financeEngine"
import { useSafeArray } from "@/lib/useSafeArray"

interface Props {
  debts?: Debt[]
  strategy?: "snowball" | "avalanche"
}

export default function DebtTimelineChart({
  debts,
  strategy = "avalanche"
}: Props) {

  const safeDebts = useSafeArray(debts)

  const timeline = calculatePayoffTimeline(safeDebts, strategy)

  const data = timeline.map(item => ({
    month: item.month,
    balance: item.remainingBalance
  }))

  return (
    <div className="bg-white p-6 rounded-xl shadow">

      <h2 className="text-lg font-semibold mb-4">
        Debt Payoff Timeline
      </h2>

      <ResponsiveContainer width="100%" height={300}>

        <LineChart data={data}>

          <XAxis dataKey="month" />

          <YAxis />

          <Tooltip />

          <Line
            type="monotone"
            dataKey="balance"
            stroke="#2563eb"
            strokeWidth={3}
          />

        </LineChart>

      </ResponsiveContainer>

    </div>
  )
}