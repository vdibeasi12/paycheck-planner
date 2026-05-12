"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts"

type ChartData = {
  name: string
  value: number
}

const COLORS = ["#3B82F6", "#EF4444"]

export default function PaycheckBreakdownChart() {

  const [data, setData] = useState<ChartData[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {

    try {

      const supabase = createClient()

      const { data: bills } = await supabase
        .from("bills")
        .select("amount")

      const { data: debts } = await supabase
        .from("debts")
        .select("minimum_payment")

      const totalBills =
        bills?.reduce((sum: number, b: any) => sum + Number(b.amount), 0) || 0

      const totalDebt =
        debts?.reduce((sum: number, d: any) => sum + Number(d.minimum_payment), 0) || 0

      setData([
        { name: "Bills", value: totalBills },
        { name: "Debt Minimums", value: totalDebt }
      ])

    } catch (err) {
      console.error("Chart error:", err)
      setData([])
    }
  }

  if (data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-xl font-bold mb-4">
          Paycheck Breakdown
        </h2>
        <p className="text-gray-500">
          No financial data available yet.
        </p>
      </div>
    )
  }

  return (

    <div className="bg-white p-6 rounded-2xl shadow">

      <h2 className="text-xl font-bold mb-4">
        Paycheck Breakdown
      </h2>

      <div style={{ width: "100%", height: 250 }}>

        <ResponsiveContainer>

          <PieChart>

            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={90}
              label
            >

              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}

            </Pie>

            <Tooltip />

          </PieChart>

        </ResponsiveContainer>

      </div>

    </div>

  )
}