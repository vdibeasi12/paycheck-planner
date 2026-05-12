"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts"

export default function DashboardClient() {
  const supabase = createClient()

  const [email, setEmail] = useState<string | null>(null)
  const [debts, setDebts] = useState<any[]>([])
  const [income, setIncome] = useState<any[]>([])

  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [incomeAmount, setIncomeAmount] = useState("")

  // 🔥 PLAN STATE
  const [plan, setPlan] = useState<"free" | "starter" | "premium">("free")

  const [strategy, setStrategy] = useState<"snowball" | "avalanche">("snowball")

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      setEmail(data.user?.email || null)

      // 🔥 TEMP PLAN TEST (CHANGE THIS)
      setPlan("free") // "starter" | "premium"

      fetchDebts()
      fetchIncome()
    }
    load()
  }, [])

  const fetchDebts = async () => {
    const { data } = await supabase.from("debts").select("*")
    setDebts(data || [])
  }

  const fetchIncome = async () => {
    const { data } = await supabase.from("income").select("*")
    setIncome(data || [])
  }

  // 🔥 ADD DEBT WITH LIMITS
  const addDebt = async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user || !name || !amount) return

    // 🔒 FREE LIMIT
    if (plan === "free" && debts.length >= 3) {
      alert("Free plan limit reached (3 debts). Upgrade to continue.")
      return
    }

    // 🔒 STARTER LIMIT
    if (plan === "starter" && debts.length >= 10) {
      alert("Starter plan limit reached (10 debts). Upgrade to Premium.")
      return
    }

    await supabase.from("debts").insert([
      {
        user_id: userData.user.id,
        name,
        balance: parseFloat(amount),
        interest: Math.random() * 20,
      },
    ])

    setName("")
    setAmount("")
    fetchDebts()
  }

  const addIncome = async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user || !incomeAmount) return

    await supabase.from("income").insert([
      {
        user_id: userData.user.id,
        amount: parseFloat(incomeAmount),
      },
    ])

    setIncomeAmount("")
    fetchIncome()
  }

  const deleteDebt = async (id: string) => {
    await supabase.from("debts").delete().eq("id", id)
    fetchDebts()
  }

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.balance), 0)

  // 🔥 STRATEGY LOCK (STARTER+)
  const sortedDebts =
    plan !== "free"
      ? strategy === "snowball"
        ? [...debts].sort((a, b) => a.balance - b.balance)
        : [...debts].sort((a, b) => b.interest - a.interest)
      : debts

  // 🔥 AI LOCK (PREMIUM ONLY)
  const aiInsight =
    plan === "premium"
      ? strategy === "snowball"
        ? "Snowball builds momentum by clearing smaller debts first."
        : "Avalanche minimizes interest by targeting high-interest debts first."
      : null

  const pieData = debts.map((d) => ({
    name: d.name,
    value: d.balance,
  }))

  const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"]

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">

      {/* HEADER */}
      <div className="flex justify-between mb-10">
        <h1 className="text-3xl">Dashboard</h1>
        <div className="text-right">
          <p className="text-gray-400">{email}</p>
          <p className="text-sm text-green-400 capitalize">{plan} plan</p>
        </div>
      </div>

      {/* TOTAL */}
      <div className="border p-6 rounded mb-8">
        <h3>Total Debt</h3>
        <p className="text-2xl">${totalDebt.toFixed(2)}</p>
      </div>

      {/* 🔒 STRATEGY */}
      {plan !== "free" ? (
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setStrategy("snowball")}
            className={`px-4 py-2 rounded ${
              strategy === "snowball"
                ? "bg-green-500 text-black"
                : "bg-gray-700"
            }`}
          >
            Snowball
          </button>

          <button
            onClick={() => setStrategy("avalanche")}
            className={`px-4 py-2 rounded ${
              strategy === "avalanche"
                ? "bg-blue-500"
                : "bg-gray-700"
            }`}
          >
            Avalanche
          </button>
        </div>
      ) : (
        <p className="mb-6 text-gray-500">
          Upgrade to Starter to unlock payoff strategies
        </p>
      )}

      {/* 🔒 AI */}
      {plan === "premium" ? (
        <div className="border p-4 rounded mb-6 bg-white/5">
          <h3 className="mb-2 font-semibold">AI Insight</h3>
          <p className="text-gray-300">{aiInsight}</p>
        </div>
      ) : (
        <p className="mb-6 text-gray-500">
          Upgrade to Premium to unlock AI insights
        </p>
      )}

      {/* PAYOFF ORDER */}
      <div className="border p-4 rounded mb-8">
        <h3 className="mb-4 font-semibold">Payoff Order</h3>

        {sortedDebts.map((d, i) => (
          <div key={d.id}>
            {i + 1}. {d.name} (${d.balance})
          </div>
        ))}
      </div>

      {/* 🔒 CHART */}
      {plan !== "free" ? (
        <div className="border p-6 rounded mb-8">
          <h3 className="mb-4">Debt Breakdown</h3>

          <div style={{ width: "100%", height: 300 }}>
            <PieChart width={400} height={300}>
              <Pie data={pieData} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </div>
        </div>
      ) : (
        <p className="mb-8 text-gray-500">
          Upgrade to Starter to unlock charts
        </p>
      )}

      {/* ADD DEBT */}
      <div className="mb-6">
        <input
          placeholder="Debt Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 mr-2 text-black"
        />

        <input
          placeholder="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="p-2 mr-2 text-black"
        />

        <button onClick={addDebt} className="bg-green-500 px-4 py-2">
          Add Debt
        </button>
      </div>

      {/* ADD INCOME */}
      <div className="mb-6">
        <input
          placeholder="Income"
          type="number"
          value={incomeAmount}
          onChange={(e) => setIncomeAmount(e.target.value)}
          className="p-2 mr-2 text-black"
        />

        <button onClick={addIncome} className="bg-blue-500 px-4 py-2">
          Add Income
        </button>
      </div>

      {/* LIST */}
      <div>
        {debts.map((d) => (
          <div key={d.id} className="flex justify-between mb-2">
            {d.name} - ${d.balance}
            <button onClick={() => deleteDebt(d.id)}>Delete</button>
          </div>
        ))}
      </div>

    </div>
  )
}