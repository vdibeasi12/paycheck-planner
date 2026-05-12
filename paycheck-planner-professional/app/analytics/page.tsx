"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts"

export default function Analytics() {

  const [debts, setDebts] = useState<any[]>([])
  const [totalDebt, setTotalDebt] = useState(0)
  const [avgInterest, setAvgInterest] = useState(0)

  useEffect(() => {
    loadDebts()
  }, [])

  async function loadDebts() {
    const { data } = await supabase.from("bills").select("*")

    if (!data) return

    setDebts(data)

    let total = 0
    let interestTotal = 0

    data.forEach((d:any) => {
      total += Number(d.amount)
      interestTotal += Number(d.interest || 0)
    })

    setTotalDebt(total)

    if(data.length > 0){
      setAvgInterest((interestTotal / data.length).toFixed(2))
    }
  }

  const COLORS = ["#2563eb","#22c55e","#f59e0b","#ef4444","#8b5cf6"]

  return (
    <div className="p-10">

      <h1 className="text-3xl font-bold mb-8">
        Debt Analytics
      </h1>

      <div className="grid grid-cols-3 gap-6 mb-10">

        <div className="bg-gray-900 p-6 rounded">
          <p>Total Debt</p>
          <p className="text-2xl font-bold">
            ${totalDebt}
          </p>
        </div>

        <div className="bg-gray-900 p-6 rounded">
          <p>Number of Debts</p>
          <p className="text-2xl font-bold">
            {debts.length}
          </p>
        </div>

        <div className="bg-gray-900 p-6 rounded">
          <p>Average Interest</p>
          <p className="text-2xl font-bold">
            {avgInterest}%
          </p>
        </div>

      </div>

      <div className="bg-gray-900 p-8 rounded h-[400px]">

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>

            <Pie
              data={debts}
              dataKey="amount"
              nameKey="name"
              outerRadius={140}
              label
            >
              {debts.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
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