"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts"

type Debt = {
  id?: string
  name?: string
  balance?: number
  interest_rate?: number
  minimum_payment?: number
}

const COLORS = [
  "#10b981",
  "#34d399",
  "#6ee7b7",
  "#059669",
  "#0ea5e9",
  "#6366f1",
  "#f59e0b",
  "#f43f5e",
]

const tooltipStyle = {
  background: "#0b1220",
  border: "1px solid #1f2937",
  borderRadius: 8,
  color: "#fff",
}

export default function DashboardCharts({ debts }: { debts: Debt[] }) {
  const items = (debts || []).filter((d) => Number(d.balance) > 0)

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Add a debt to see your balance breakdown and interest-rate comparison here.
      </p>
    )
  }

  const pieData = items.map((d) => ({
    name: d.name || "Debt",
    value: Number(d.balance) || 0,
  }))
  const aprData = items.map((d) => ({
    name: d.name || "Debt",
    apr: Number(d.interest_rate) || 0,
  }))
  const money = (n: number) => "$" + Math.round(n).toLocaleString()

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-300">Balance by debt</h3>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: any) => money(Number(v))}
                contentStyle={tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-300">Interest rate (APR)</h3>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={aprData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 12 }} unit="%" />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                width={90}
              />
              <Tooltip formatter={(v: any) => `${v}%`} contentStyle={tooltipStyle} />
              <Bar dataKey="apr" fill="#34d399" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}