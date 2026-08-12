"use client"

import { useState } from "react"

function money(n: number): string {
  if (!isFinite(n)) return "--"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

type Result = {
  months: number
  totalInterest: number
  totalPaid: number
  neverPaysOff: boolean
}

function simulate(balance: number, apr: number, payment: number): Result {
  if (balance <= 0 || payment <= 0) {
    return { months: 0, totalInterest: 0, totalPaid: 0, neverPaysOff: false }
  }
  const monthlyRate = apr / 100 / 12
  let remaining = balance
  let totalInterest = 0
  let months = 0
  const MAX_MONTHS = 600 // 50 years -- a sane cap so a too-low payment doesn't loop forever

  while (remaining > 0 && months < MAX_MONTHS) {
    const interest = remaining * monthlyRate
    if (payment <= interest) {
      // Payment doesn't even cover interest -- balance never shrinks.
      return { months: 0, totalInterest: 0, totalPaid: 0, neverPaysOff: true }
    }
    remaining = remaining + interest - payment
    totalInterest += interest
    months++
  }

  const finalRemaining = Math.max(0, remaining)
  return {
    months,
    totalInterest,
    totalPaid: balance + totalInterest - finalRemaining,
    neverPaysOff: months >= MAX_MONTHS && remaining > 0,
  }
}

export default function DebtPayoffCalculator() {
  const [balance, setBalance] = useState("")
  const [apr, setApr] = useState("")
  const [payment, setPayment] = useState("")

  const result = simulate(parseFloat(balance) || 0, parseFloat(apr) || 0, parseFloat(payment) || 0)
  const years = Math.floor(result.months / 12)
  const remMonths = result.months % 12

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Current balance</span>
            <input
              type="number"
              min="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="5000"
              className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Interest rate (APR %)</span>
            <input
              type="number"
              min="0"
              value={apr}
              onChange={(e) => setApr(e.target.value)}
              placeholder="22.9"
              className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Monthly payment</span>
            <input
              type="number"
              min="0"
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              placeholder="200"
              className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
            />
          </label>
        </div>
      </div>

      {result.neverPaysOff ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <p className="font-semibold text-white">This payment won't pay off the balance</p>
          <p className="mt-1 text-sm text-gray-400">
            At this interest rate, your monthly payment doesn't even cover the interest that
            accrues each month -- the balance will grow, not shrink. You'll need a higher payment.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <p className="text-sm text-gray-300">Time to pay off</p>
          <p className="text-4xl font-bold text-white">
            {years > 0 ? `${years}y ` : ""}
            {remMonths}mo
          </p>
          <p className="mt-2 text-sm text-gray-400">Total interest paid: {money(result.totalInterest)}</p>
          <p className="text-sm text-gray-400">Total paid: {money(result.totalPaid)}</p>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Assumes a fixed monthly payment and a fixed interest rate with no new charges. Real credit
        card minimums shrink as the balance drops, which stretches payoff time further than a fixed
        payment.
      </p>
    </div>
  )
}
