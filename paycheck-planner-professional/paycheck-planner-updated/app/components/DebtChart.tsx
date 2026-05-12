"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts"

const data = [
  { month: "Start", balance: 24500 },
  { month: "Month 6", balance: 21000 },
  { month: "Month 12", balance: 17000 },
  { month: "Month 18", balance: 13000 },
  { month: "Month 24", balance: 9000 },
  { month: "Month 30", balance: 5000 },
  { month: "Month 36", balance: 0 }
]

export default function DebtChart() {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>

          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="month" />

          <YAxis />

          <Tooltip />

          <Line
            type="monotone"
            dataKey="balance"
            stroke="#10b981"
            strokeWidth={3}
          />

        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}