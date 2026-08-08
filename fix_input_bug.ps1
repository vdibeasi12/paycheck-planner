# Fixes the number-input select-on-focus bug (typing into a field showing 0
# appended digits instead of replacing them) on the Payoff Plan and standalone
# Debt Payoff Calculator pages.
[Environment]::CurrentDirectory = (Get-Location).Path
$ErrorActionPreference = "Stop"
$global:anyFail = $false

$f_app_components_AmortizationSchedule_tsx = @'
"use client"

import { useMemo, useState } from "react"
import { Download, CalendarClock, TrendingDown, AlertTriangle } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"

type Debt = {
  id: string
  name: string
  balance: number
  interest_rate: number
  minimum_payment: number
}

type Props = {
  debts: Debt[]
}

type Strategy = "snowball" | "avalanche"

type DebtRow = {
  month: number
  label: string
  debtId: string
  debtName: string
  startBalance: number
  payment: number
  interest: number
  principal: number
  endBalance: number
}

type MonthRow = {
  month: number
  label: string
  startBalance: number
  payment: number
  interest: number
  principal: number
  endBalance: number
}

type PerDebt = {
  id: string
  name: string
  payoffMonth: number
  payoffLabel: string
  totalInterest: number
}

type Sim = {
  monthlyRows: MonthRow[]
  debtRows: DebtRow[]
  perDebt: PerDebt[]
  months: number
  totalInterest: number
  totalPaid: number
  capped: boolean
  nonAmortizing: boolean
}

const MAX_MONTHS = 600

const round2 = (n: number) => Math.round(n * 100) / 100

function monthLabel(start: Date, offset: number): string {
  const d = new Date(start.getFullYear(), start.getMonth() + offset, 1)
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function simulate(debts: Debt[], strategy: Strategy, extra: number, start: Date): Sim {
  // Working copy of each debt, cents-safe.
  // interest_rate is treated as an annual percentage (e.g. 19.99 = 19.99% APR).
  const working = debts
    .map((d) => ({
      id: d.id,
      name: d.name || "Debt",
      balance: round2(Math.max(0, Number(d.balance) || 0)),
      monthlyRate: Math.max(0, Number(d.interest_rate) || 0) / 100 / 12,
      min: round2(Math.max(0, Number(d.minimum_payment) || 0)),
      totalInterest: 0,
      payoffMonth: 0,
    }))
    .filter((d) => d.balance > 0)

  const budget = round2(working.reduce((s, d) => s + d.min, 0) + Math.max(0, extra))

  const monthlyRows: MonthRow[] = []
  const debtRows: DebtRow[] = []

  let nonAmortizing = false
  let capped = false
  let totalInterest = 0
  let totalPaid = 0
  let month = 0

  const active = () => working.filter((d) => d.balance > 0.005)

  // If the constant budget cannot cover the first month's total interest,
  // balances never fall and there is no payoff.
  const firstInterest = working.reduce((s, d) => s + d.balance * d.monthlyRate, 0)
  if (budget <= round2(firstInterest)) {
    nonAmortizing = true
  }

  while (!nonAmortizing && active().length > 0 && month < MAX_MONTHS) {
    month += 1
    const label = monthLabel(start, month - 1)

    const order =
      strategy === "snowball"
        ? [...active()].sort((a, b) => a.balance - b.balance)
        : [...active()].sort((a, b) => b.monthlyRate - a.monthlyRate)

    // 1) Accrue interest on every active debt.
    const monthStart: Record<string, number> = {}
    const monthInterest: Record<string, number> = {}
    const monthPaid: Record<string, number> = {}
    for (const d of active()) {
      monthStart[d.id] = d.balance
      const interest = round2(d.balance * d.monthlyRate)
      monthInterest[d.id] = interest
      d.balance = round2(d.balance + interest)
      d.totalInterest = round2(d.totalInterest + interest)
      totalInterest = round2(totalInterest + interest)
    }

    // 2) Pay minimums on all active debts to stay current.
    let available = budget
    for (const d of active()) {
      const pay = round2(Math.min(d.min, d.balance, available))
      d.balance = round2(d.balance - pay)
      available = round2(available - pay)
      monthPaid[d.id] = round2((monthPaid[d.id] || 0) + pay)
    }

    // 3) Direct the remaining budget at debts in strategy order (the snowball).
    for (const d of order) {
      if (available <= 0) break
      if (d.balance <= 0) continue
      const pay = round2(Math.min(available, d.balance))
      d.balance = round2(d.balance - pay)
      available = round2(available - pay)
      monthPaid[d.id] = round2((monthPaid[d.id] || 0) + pay)
    }

    // 4) Record per-debt rows for debts touched this month + combined totals.
    let mStart = 0
    let mPay = 0
    let mInt = 0
    let mEnd = 0
    for (const d of working) {
      const sBal = monthStart[d.id]
      if (sBal === undefined) continue
      const pay = round2(monthPaid[d.id] || 0)
      const interest = round2(monthInterest[d.id] || 0)
      const rawEnd = round2(d.balance)
      const end = rawEnd < 0.005 ? 0 : rawEnd
      const principal = round2(pay - interest)
      debtRows.push({
        month,
        label,
        debtId: d.id,
        debtName: d.name,
        startBalance: sBal,
        payment: pay,
        interest,
        principal,
        endBalance: end,
      })
      mStart = round2(mStart + sBal)
      mPay = round2(mPay + pay)
      mInt = round2(mInt + interest)
      mEnd = round2(mEnd + end)
      totalPaid = round2(totalPaid + pay)
      if (d.balance <= 0.005 && d.payoffMonth === 0) {
        d.payoffMonth = month
      }
    }

    monthlyRows.push({
      month,
      label,
      startBalance: mStart,
      payment: mPay,
      interest: mInt,
      principal: round2(mPay - mInt),
      endBalance: mEnd,
    })
  }

  if (active().length > 0 && month >= MAX_MONTHS) {
    capped = true
  }

  const perDebt: PerDebt[] = working.map((d) => ({
    id: d.id,
    name: d.name,
    payoffMonth: d.payoffMonth,
    payoffLabel: d.payoffMonth > 0 ? monthLabel(start, d.payoffMonth - 1) : "-",
    totalInterest: round2(d.totalInterest),
  }))

  return {
    monthlyRows,
    debtRows,
    perDebt,
    months: month,
    totalInterest: round2(totalInterest),
    totalPaid: round2(totalPaid),
    capped,
    nonAmortizing,
  }
}

function toCsv(rows: DebtRow[]): string {
  const header = [
    "Month",
    "Date",
    "Debt",
    "Starting Balance",
    "Payment",
    "Interest",
    "Principal",
    "Ending Balance",
  ]
  const esc = (v: string) => {
    if (v.indexOf(",") >= 0 || v.indexOf('"') >= 0 || v.indexOf("\n") >= 0) {
      return '"' + v.replace(/"/g, '""') + '"'
    }
    return v
  }
  const lines = [header.join(",")]
  for (const r of rows) {
    lines.push(
      [
        String(r.month),
        esc(r.label),
        esc(r.debtName),
        r.startBalance.toFixed(2),
        r.payment.toFixed(2),
        r.interest.toFixed(2),
        r.principal.toFixed(2),
        r.endBalance.toFixed(2),
      ].join(",")
    )
  }
  return lines.join("\n")
}

export default function AmortizationSchedule({ debts }: Props) {
  const formatMoney = useFormatCurrency()
  const fmt = formatMoney
  const fmt0 = (n: number) => formatMoney(Math.round(n))
  const [strategy, setStrategy] = useState<Strategy>("snowball")
  const [extra, setExtra] = useState<number>(0)

  const start = useMemo(() => new Date(), [])
  const sim = useMemo(() => simulate(debts, strategy, extra, start), [debts, strategy, extra, start])

  const download = () => {
    const csv = toCsv(sim.debtRows)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "amortization-" + strategy + ".csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const years = Math.floor(sim.months / 12)
  const remMonths = sim.months % 12
  const durationText =
    sim.months === 0
      ? "-"
      : (
          (years > 0 ? years + (years === 1 ? " yr " : " yrs ") : "") +
          (remMonths > 0 ? remMonths + (remMonths === 1 ? " mo" : " mos") : "")
        ).trim()

  const debtFreeLabel = sim.months > 0 ? monthLabel(start, sim.months - 1) : "-"

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
            Strategy
          </label>
          <div className="inline-flex rounded-lg border border-gray-700 bg-[#0f172a] p-1">
            <button
              onClick={() => setStrategy("snowball")}
              className={
                "rounded-md px-3 py-1.5 text-sm transition " +
                (strategy === "snowball"
                  ? "bg-green-500 font-medium text-black"
                  : "text-gray-300 hover:text-white")
              }
            >
              Snowball
            </button>
            <button
              onClick={() => setStrategy("avalanche")}
              className={
                "rounded-md px-3 py-1.5 text-sm transition " +
                (strategy === "avalanche"
                  ? "bg-green-500 font-medium text-black"
                  : "text-gray-300 hover:text-white")
              }
            >
              Avalanche
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
            Extra monthly payment
          </label>
          <div className="flex items-center rounded-lg border border-gray-700 bg-[#0f172a] px-3">
            <span className="text-gray-400">$</span>
            <input
              type="number"
              min={0}
              step={25}
              value={Number.isFinite(extra) ? extra : 0}
              onChange={(e) => setExtra(Math.max(0, Number(e.target.value) || 0))}
              onFocus={(e) => e.target.select()}
              className="w-28 bg-transparent px-2 py-2 text-white outline-none placeholder:text-gray-500"
              placeholder="0"
            />
          </div>
        </div>

        <button
          onClick={download}
          disabled={sim.debtRows.length === 0}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={16} />
          Download CSV
        </button>
      </div>

      {sim.nonAmortizing && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <span>
            At the current payments, your total monthly payment does not cover the interest that
            accrues, so the balances never fall. Add an extra monthly payment to see a payoff
            schedule.
          </span>
        </div>
      )}

      {sim.capped && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <span>
            Payoff takes longer than 50 years at this payment. Add an extra monthly payment to
            shorten it.
          </span>
        </div>
      )}

      {!sim.nonAmortizing && sim.months > 0 && (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-5">
              <div className="flex items-center gap-2 text-gray-400">
                <CalendarClock size={16} className="text-emerald-400" />
                <span className="text-xs font-medium uppercase tracking-wide">Debt-free</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-400">{debtFreeLabel}</p>
              <p className="text-sm text-gray-400">{durationText}</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-5">
              <div className="flex items-center gap-2 text-gray-400">
                <TrendingDown size={16} className="text-emerald-400" />
                <span className="text-xs font-medium uppercase tracking-wide">Total interest</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{fmt0(sim.totalInterest)}</p>
              <p className="text-sm text-gray-400">paid over the plan</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-5">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-xs font-medium uppercase tracking-wide">Total paid</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{fmt0(sim.totalPaid)}</p>
              <p className="text-sm text-gray-400">principal plus interest</p>
            </div>
          </div>

          {/* Per-debt payoff order */}
          <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-5">
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-400">
              Payoff order
            </h3>
            <div className="space-y-2">
              {[...sim.perDebt]
                .sort((a, b) => a.payoffMonth - b.payoffMonth)
                .map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-white">{d.name}</span>
                    <span className="text-sm text-gray-400">
                      paid off {d.payoffLabel} - {fmt(d.totalInterest)} interest
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Monthly schedule */}
          <div className="rounded-2xl border border-gray-700 bg-[#0f172a]">
            <div className="border-b border-gray-800 px-5 py-3">
              <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400">
                Monthly schedule (combined)
              </h3>
            </div>
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#0b1220] text-gray-400">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-medium">#</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 text-right font-medium">Start</th>
                    <th className="px-4 py-2 text-right font-medium">Payment</th>
                    <th className="px-4 py-2 text-right font-medium">Interest</th>
                    <th className="px-4 py-2 text-right font-medium">Principal</th>
                    <th className="px-4 py-2 text-right font-medium">End</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.monthlyRows.map((r) => (
                    <tr key={r.month} className="border-t border-gray-800 text-gray-200">
                      <td className="px-4 py-2 text-gray-500">{r.month}</td>
                      <td className="px-4 py-2">{r.label}</td>
                      <td className="px-4 py-2 text-right">{fmt(r.startBalance)}</td>
                      <td className="px-4 py-2 text-right">{fmt(r.payment)}</td>
                      <td className="px-4 py-2 text-right text-amber-300">{fmt(r.interest)}</td>
                      <td className="px-4 py-2 text-right text-emerald-300">{fmt(r.principal)}</td>
                      <td className="px-4 py-2 text-right">{fmt(r.endBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "app/components/AmortizationSchedule.tsx"), $f_app_components_AmortizationSchedule_tsx, (New-Object System.Text.UTF8Encoding($false)))
$c_f_app_components_AmortizationSchedule_tsx = Select-String -Path "app/components/AmortizationSchedule.tsx" -Pattern "onFocus" -SimpleMatch
if ($c_f_app_components_AmortizationSchedule_tsx) { Write-Host "OK   app/components/AmortizationSchedule.tsx" -ForegroundColor Green } else { Write-Host "FAIL app/components/AmortizationSchedule.tsx" -ForegroundColor Red; $global:anyFail = $true }

$f_app_debt_payoff_calculator_page_tsx = @'
'use client'

import { useState } from 'react'
import { Plus, Trash2, Download, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { useFormatCurrency } from '@/lib/i18n/formatCurrency'

interface Debt {
  id: string
  name: string
  balance: number
  interestRate: number
  minimumPayment: number
}

interface PayoffResult {
  strategy: 'snowball' | 'avalanche'
  monthsToPayoff: number
  totalInterestPaid: number
  monthlyTimeline: Array<{
    month: number
    remainingBalance: number
    interest: number
    principal: number
  }>
}

export default function DebtPayoffCalculator() {
  const formatMoney = useFormatCurrency()
  const [debts, setDebts] = useState<Debt[]>([
    { id: '1', name: 'Credit Card', balance: 5000, interestRate: 18.5, minimumPayment: 150 },
  ])
  const [extraPayment, setExtraPayment] = useState(0)
  const [snowballResult, setSnowballResult] = useState<PayoffResult | null>(null)
  const [avalancheResult, setAvalancheResult] = useState<PayoffResult | null>(null)

  // Calculate payoff timeline
  const calculatePayoff = (strategy: 'snowball' | 'avalanche'): PayoffResult => {
    const workingDebts = debts.map(d => ({ ...d }))
    
    // Sort based on strategy
    if (strategy === 'snowball') {
      workingDebts.sort((a, b) => a.balance - b.balance)
    } else {
      workingDebts.sort((a, b) => b.interestRate - a.interestRate)
    }

    const timeline: PayoffResult['monthlyTimeline'] = []
    let month = 0
    let totalInterestPaid = 0

    while (workingDebts.some(d => d.balance > 0) && month < 600) {
      month++
      let extraPaymentThisMonth = extraPayment

      // Calculate interest and apply payments
      workingDebts.forEach((debt, index) => {
        if (debt.balance <= 0) return

        const monthlyInterest = (debt.balance * (debt.interestRate / 100)) / 12
        debt.balance += monthlyInterest
        totalInterestPaid += monthlyInterest

        let payment = debt.minimumPayment
        if (index === 0) {
          payment += extraPaymentThisMonth
          extraPaymentThisMonth = 0
        }

        debt.balance -= payment
        if (debt.balance < 0) {
          debt.balance = 0
        }
      })

      const totalRemaining = workingDebts.reduce((sum, d) => sum + d.balance, 0)
      timeline.push({
        month,
        remainingBalance: totalRemaining,
        interest: 0,
        principal: 0,
      })
    }

    return {
      strategy,
      monthsToPayoff: month,
      totalInterestPaid,
      monthlyTimeline: timeline,
    }
  }

  const handleCalculate = () => {
    const snowball = calculatePayoff('snowball')
    const avalanche = calculatePayoff('avalanche')
    setSnowballResult(snowball)
    setAvalancheResult(avalanche)
  }

  const handleAddDebt = () => {
    setDebts([
      ...debts,
      {
        id: Date.now().toString(),
        name: 'New Debt',
        balance: 1000,
        interestRate: 10,
        minimumPayment: 100,
      },
    ])
  }

  const handleDeleteDebt = (id: string) => {
    setDebts(debts.filter(d => d.id !== id))
  }

  const handleUpdateDebt = (id: string, field: keyof Debt, value: any) => {
    setDebts(debts.map(d => (d.id === id ? { ...d, [field]: value } : d)))
  }

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)
  const totalMinimum = debts.reduce((sum, d) => sum + d.minimumPayment, 0)

  const downloadResults = () => {
    if (!snowballResult || !avalancheResult) return

    const csv = `Debt Payoff Comparison Report
Generated: ${new Date().toLocaleDateString()}

SNOWBALL STRATEGY (Pay smallest balance first):
Months to Debt Freedom: ${snowballResult.monthsToPayoff}
Total Interest Paid: ${formatMoney(snowballResult.totalInterestPaid)}
Monthly Payments: ${formatMoney(totalMinimum + extraPayment)}

AVALANCHE STRATEGY (Pay highest interest first):
Months to Debt Freedom: ${avalancheResult.monthsToPayoff}
Total Interest Paid: ${formatMoney(avalancheResult.totalInterestPaid)}
Monthly Payments: ${formatMoney(totalMinimum + extraPayment)}

SAVINGS WITH ${avalancheResult.totalInterestPaid < snowballResult.totalInterestPaid ? 'AVALANCHE' : 'SNOWBALL'}:
Interest Saved: ${formatMoney(Math.abs(snowballResult.totalInterestPaid - avalancheResult.totalInterestPaid))}
Time Saved: ${Math.abs(snowballResult.monthsToPayoff - avalancheResult.monthsToPayoff)} months

DEBTS:
${debts.map(d => `${d.name}: ${formatMoney(d.balance)} @ ${d.interestRate}% APR`).join('\n')}

Extra Monthly Payment: ${formatMoney(extraPayment)}
`

    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(csv))
    element.setAttribute('download', 'debt-payoff-comparison.csv')
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="text-green-500" size={32} />
            <h1 className="text-4xl font-bold">Debt Payoff Calculator</h1>
          </div>
          <p className="text-gray-300">
            Compare Snowball vs Avalanche strategies to find your fastest path to debt freedom
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6 sticky top-6">
              <h2 className="text-2xl font-bold mb-6">Your Debts</h2>

              {/* Debt List */}
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {debts.map((debt) => (
                  <div key={debt.id} className="bg-[#1a233a] p-4 rounded-lg border border-gray-700">
                    <input
                      type="text"
                      value={debt.name}
                      onChange={(e) => handleUpdateDebt(debt.id, 'name', e.target.value)}
                      className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 mb-2 text-white text-sm"
                      placeholder="Debt name"
                    />
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <label className="text-gray-400">Balance</label>
                        <input
                          type="number"
                          value={debt.balance}
                          onChange={(e) => handleUpdateDebt(debt.id, 'balance', Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="text-gray-400">Interest Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={debt.interestRate}
                          onChange={(e) => handleUpdateDebt(debt.id, 'interestRate', Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="text-gray-400">Minimum Payment</label>
                        <input
                          type="number"
                          value={debt.minimumPayment}
                          onChange={(e) => handleUpdateDebt(debt.id, 'minimumPayment', Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-white"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteDebt(debt.id)}
                      className="w-full mt-2 text-red-400 hover:text-red-300 transition text-sm flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} /> Remove
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Debt Button */}
              <button
                onClick={handleAddDebt}
                className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-2 rounded-lg transition mb-6 flex items-center justify-center gap-2"
              >
                <Plus size={20} /> Add Debt
              </button>

              {/* Extra Payment */}
              <div className="bg-[#1a233a] p-4 rounded-lg border border-gray-700 mb-6">
                <label className="text-gray-400 text-sm">Extra Monthly Payment</label>
                <input
                  type="number"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-[#0f172a] border border-gray-700 rounded px-2 py-1 text-white mt-1"
                />
                <p className="text-gray-500 text-xs mt-2">Amount above minimum payments</p>
              </div>

              {/* Calculate Button */}
              <button
                onClick={handleCalculate}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition"
              >
                Calculate Payoff Plans
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            {snowballResult && avalancheResult ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
                  <h3 className="text-2xl font-bold mb-6">Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Total Debt</p>
                      <p className="text-2xl font-bold text-green-400">{formatMoney(totalDebt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Total Monthly Payment</p>
                      <p className="text-2xl font-bold text-blue-400">{formatMoney(totalMinimum + extraPayment)}</p>
                    </div>
                  </div>
                </div>

                {/* Snowball Strategy */}
                <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/30 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 text-orange-400">🎾 Snowball Strategy</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Pay off smallest balance first for quick wins
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Debt Freedom In</p>
                      <p className="text-3xl font-bold text-orange-400">
                        {snowballResult.monthsToPayoff} months
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        (~{(snowballResult.monthsToPayoff / 12).toFixed(1)} years)
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Total Interest Paid</p>
                      <p className="text-3xl font-bold text-orange-400">
                        {formatMoney(snowballResult.totalInterestPaid)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Avalanche Strategy */}
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/30 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4 text-blue-400">⚡ Avalanche Strategy</h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Pay off highest interest first to save money
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Debt Freedom In</p>
                      <p className="text-3xl font-bold text-blue-400">
                        {avalancheResult.monthsToPayoff} months
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        (~{(avalancheResult.monthsToPayoff / 12).toFixed(1)} years)
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Total Interest Paid</p>
                      <p className="text-3xl font-bold text-blue-400">
                        {formatMoney(avalancheResult.totalInterestPaid)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comparison */}
                <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Comparison</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Time Difference</span>
                      <span className="font-bold text-green-400">
                        {Math.abs(snowballResult.monthsToPayoff - avalancheResult.monthsToPayoff)} months
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Interest Savings</span>
                      <span className="font-bold text-green-400">
                        {formatMoney(Math.abs(snowballResult.totalInterestPaid - avalancheResult.totalInterestPaid))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Better Strategy</span>
                      <span className="font-bold">
                        {avalancheResult.totalInterestPaid < snowballResult.totalInterestPaid ? (
                          <span className="text-blue-400">⚡ Avalanche</span>
                        ) : (
                          <span className="text-orange-400">🎾 Snowball</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Export Button */}
                <button
                  onClick={downloadResults}
                  className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Download size={20} /> Download Comparison Report
                </button>
              </div>
            ) : (
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-12 text-center">
                <BarChart3 className="mx-auto mb-4 text-gray-500" size={48} />
                <p className="text-gray-400 text-lg">
                  Enter your debts and click "Calculate Payoff Plans" to see results
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-[#0f172a] border border-gray-700 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Which Strategy is Right for You?</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-orange-400 mb-2">🎾 Choose Snowball if:</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>✓ You need motivation from quick wins</li>
                <li>✓ You want psychological momentum</li>
                <li>✓ You have many small debts</li>
                <li>✓ You struggle with motivation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">⚡ Choose Avalanche if:</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>✓ You want to save the most money</li>
                <li>✓ You have high-interest debts</li>
                <li>✓ You're mathematically motivated</li>
                <li>✓ Long-term savings matter to you</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "app/debt-payoff-calculator/page.tsx"), $f_app_debt_payoff_calculator_page_tsx, (New-Object System.Text.UTF8Encoding($false)))
$c_f_app_debt_payoff_calculator_page_tsx = Select-String -Path "app/debt-payoff-calculator/page.tsx" -Pattern "onFocus" -SimpleMatch
if ($c_f_app_debt_payoff_calculator_page_tsx) { Write-Host "OK   app/debt-payoff-calculator/page.tsx" -ForegroundColor Green } else { Write-Host "FAIL app/debt-payoff-calculator/page.tsx" -ForegroundColor Red; $global:anyFail = $true }

if ($global:anyFail) {
    Write-Host ""
    Write-Host "One or more files failed verification. Stopping before commit." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Both files verified. Committing..." -ForegroundColor Cyan

git add "app/components/AmortizationSchedule.tsx" "app/debt-payoff-calculator/page.tsx"
git commit -m "Fix number inputs not selecting existing text on focus (0200 typing bug)"
git push origin main

Write-Host ""
Write-Host "Done. Vercel will auto-deploy in a minute or two." -ForegroundColor Green