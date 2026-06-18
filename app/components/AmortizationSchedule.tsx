"use client"

import { useMemo, useState } from "react"
import { Download, CalendarClock, TrendingDown, AlertTriangle } from "lucide-react"

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

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })

const fmt0 = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

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
