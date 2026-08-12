"use client"

import { useState } from "react"

const FREQUENCIES = [
  { key: "weekly", label: "Weekly", periodsPerYear: 52 },
  { key: "biweekly", label: "Biweekly", periodsPerYear: 26 },
  { key: "semimonthly", label: "Semimonthly (2x/month)", periodsPerYear: 24 },
  { key: "monthly", label: "Monthly", periodsPerYear: 12 },
] as const

function money(n: number): string {
  if (!isFinite(n)) return "--"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" })
}

export default function PaycheckCalculator() {
  const [frequency, setFrequency] = useState<(typeof FREQUENCIES)[number]["key"]>("biweekly")
  const [gross, setGross] = useState("")
  const [preTaxPct, setPreTaxPct] = useState("5")
  const [taxPct, setTaxPct] = useState("22")
  const [otherDeductions, setOtherDeductions] = useState("")

  const grossNum = parseFloat(gross) || 0
  const preTaxAmount = grossNum * ((parseFloat(preTaxPct) || 0) / 100)
  const otherNum = parseFloat(otherDeductions) || 0
  const taxable = Math.max(0, grossNum - preTaxAmount)
  const estTax = taxable * ((parseFloat(taxPct) || 0) / 100)
  const net = Math.max(0, taxable - estTax - otherNum)
  const periodsPerYear = FREQUENCIES.find((f) => f.key === frequency)!.periodsPerYear
  const annualNet = net * periodsPerYear

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Pay frequency</span>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as typeof frequency)}
              className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
            >
              {FREQUENCIES.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Gross pay per paycheck</span>
            <input
              type="number"
              min="0"
              value={gross}
              onChange={(e) => setGross(e.target.value)}
              placeholder="2000"
              className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">
              Pre-tax deductions (401k, HSA, etc.) as % of gross
            </span>
            <input
              type="number"
              min="0"
              max="100"
              value={preTaxPct}
              onChange={(e) => setPreTaxPct(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-gray-300">Estimated tax withholding %</span>
            <input
              type="number"
              min="0"
              max="100"
              value={taxPct}
              onChange={(e) => setTaxPct(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm text-gray-300">
              Other deductions per paycheck (insurance, etc.)
            </span>
            <input
              type="number"
              min="0"
              value={otherDeductions}
              onChange={(e) => setOtherDeductions(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-gray-700 bg-[#020617] px-3 py-2 text-white outline-none focus:border-emerald-400"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <p className="text-sm text-gray-300">Estimated take-home per paycheck</p>
        <p className="text-4xl font-bold text-white">{money(net)}</p>
        <p className="mt-2 text-sm text-gray-400">Estimated take-home per year: {money(annualNet)}</p>
      </div>

      <p className="text-xs text-gray-500">
        This is a rough estimate using a flat withholding percentage -- it doesn't account for your
        filing status, state taxes, or tax brackets. Use it to sanity-check a budget, not to file
        your taxes.
      </p>
    </div>
  )
}
