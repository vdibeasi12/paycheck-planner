'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, Wallet, ChevronDown, ChevronUp, Pencil, Check, X, ArrowLeftRight } from 'lucide-react'
import SmartCapture from '@/components/SmartCapture'
import { useFormatCurrency } from '@/lib/i18n/formatCurrency'
import { monthlyFactor } from '@/lib/monthlyFactor'
import { consumeCapturePrefill } from '@/lib/capturePrefill'

interface IncomeDetails {
  grossPay: number | null
  federalTax: number | null
  stateTax: number | null
  socialSecurity: number | null
  medicare: number | null
  retirement401k: number | null
  healthInsurance: number | null
  otherDeductions: number | null
  netPay: number | null
}

interface Income {
  id: string
  name: string
  amount: number
  frequency: string
  income_type: string | null
  created_at: string
  details: IncomeDetails | null
  next_pay_date: string | null
}

// A row tagged "transfer" is money moving between the user's own accounts
// (most often detected from an imported bank statement or CSV, e.g.
// "Transfer from Chime Checking Account") --
// it's excluded from income totals everywhere (here and on the dashboard)
// instead of being counted as real income. See lib/csvImport.ts's
// CATEGORY_RULES for the auto-detection and app/dashboard/page.tsx for the
// matching total-income filter.
const TRANSFER_TYPE = 'transfer'

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
]

const EMPTY_DETAILS = {
  grossPay: '',
  federalTax: '',
  stateTax: '',
  socialSecurity: '',
  medicare: '',
  retirement401k: '',
  healthInsurance: '',
  otherDeductions: '',
  netPay: '',
}

type DetailsTab = 'taxes' | 'deductions'

export default function IncomePage() {
  const formatMoney = useFormatCurrency()
  const [items, setItems] = useState<Income[]>([])
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [nextPayDate, setNextPayDate] = useState('')
  const [isTransfer, setIsTransfer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCapture, setShowCapture] = useState(false)

  const [showDetails, setShowDetails] = useState(false)
  const [detailsTab, setDetailsTab] = useState<DetailsTab>('taxes')
  const [details, setDetails] = useState(EMPTY_DETAILS)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSource, setEditSource] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editFrequency, setEditFrequency] = useState('monthly')
  const [editNextPayDate, setEditNextPayDate] = useState('')
  const [editIsTransfer, setEditIsTransfer] = useState(false)

  async function loadIncome() {
    try {
      const { data } = await supabase.from('income').select('*')
      if (data) setItems(data as Income[])
    } catch (error) {
      console.error('Error loading income:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIncome()
  }, [])

  function detailsPayload(): IncomeDetails | null {
    if (!showDetails) return null
    const toNum = (v: string) => (v === '' ? null : Number(v))
    const payload: IncomeDetails = {
      grossPay: toNum(details.grossPay),
      federalTax: toNum(details.federalTax),
      stateTax: toNum(details.stateTax),
      socialSecurity: toNum(details.socialSecurity),
      medicare: toNum(details.medicare),
      retirement401k: toNum(details.retirement401k),
      healthInsurance: toNum(details.healthInsurance),
      otherDeductions: toNum(details.otherDeductions),
      netPay: toNum(details.netPay),
    }
    // Don't store an all-null object -- treat "checked but nothing entered" as no details.
    const hasAnyValue = Object.values(payload).some((v) => v !== null)
    return hasAnyValue ? payload : null
  }

  async function addIncome(e: React.FormEvent) {
    e.preventDefault()
    if (!source || !amount) {
      alert('Please enter a source and amount')
      return
    }
    // QA fix (Aug 15 2026): "Add Income" always inserts a brand-new row --
    // there's no equivalent of the CSV importer's recurring_group_key
    // matching here. That's fine for genuinely separate income sources, but
    // it silently double-counted income for at least one real account:
    // SmartCapture-scanning (or manually re-entering) each new pay stub
    // from the SAME job creates a SEPARATE recurring income source every
    // time, since the net amount naturally differs check to check, and the
    // dashboard then sums all of them as if they were different jobs. Warn
    // before adding a second income source under a name that already
    // exists, so someone reflecting a new pay stub updates the existing
    // entry (pencil icon below) instead of stacking a duplicate on top of it.
    const trimmedSource = source.trim()
    const duplicate = items.find(
      (i) => i.income_type !== TRANSFER_TYPE && i.name.trim().toLowerCase() === trimmedSource.toLowerCase()
    )
    if (duplicate) {
      const proceed = window.confirm(
        `You already have an income source named "${duplicate.name}" (${formatMoney(duplicate.amount)} ${duplicate.frequency}). ` +
          `Adding this will count as ADDITIONAL income on top of it, not an update to it.\n\n` +
          `If this is a new pay stub from the same job, click Cancel and use the edit (pencil) icon on the existing entry instead.\n\n` +
          `Click OK only if this is really a separate income source.`
      )
      if (!proceed) return
    }
    try {
      const { data: userAuth } = await supabase.auth.getUser()
      if (!userAuth.user) {
        alert('You must be logged in to add income')
        return
      }
      const { error } = await supabase.from('income').insert({
        user_id: userAuth.user.id,
        name: source,
        amount: Number(amount),
        frequency,
        income_type: isTransfer ? TRANSFER_TYPE : null,
        next_pay_date: nextPayDate || null,
        details: detailsPayload(),
      })
      if (error) throw error
      setSource('')
      setAmount('')
      setFrequency('monthly')
      setNextPayDate('')
      setIsTransfer(false)
      setShowDetails(false)
      setDetails(EMPTY_DETAILS)
      loadIncome()
    } catch (error) {
      console.error('Error adding income:', error)
      alert('Failed to add income')
    }
  }

  const VALID_FREQUENCIES = new Set(FREQUENCIES.map((f) => f.value))

  function handleExtractedIncome(fields: {
    name: string | null
    amount: number | null
    frequency: string | null
    details: IncomeDetails | null
  }) {
    if (fields.name) setSource(fields.name)
    if (fields.amount != null) setAmount(String(fields.amount))
    if (fields.frequency && VALID_FREQUENCIES.has(fields.frequency)) {
      setFrequency(fields.frequency)
    }

    if (fields.details) {
      const toStr = (v: number | null) => (v == null ? '' : String(v))
      const extracted = {
        grossPay: toStr(fields.details.grossPay),
        federalTax: toStr(fields.details.federalTax),
        stateTax: toStr(fields.details.stateTax),
        socialSecurity: toStr(fields.details.socialSecurity),
        medicare: toStr(fields.details.medicare),
        retirement401k: toStr(fields.details.retirement401k),
        healthInsurance: toStr(fields.details.healthInsurance),
        otherDeductions: toStr(fields.details.otherDeductions),
        netPay: toStr(fields.details.netPay),
      }
      const foundAnything = Object.values(extracted).some((v) => v !== '')
      if (foundAnything) {
        setDetails(extracted)
        setShowDetails(true)
      }
    }

    setShowCapture(false)
  }

  // Picks up a scan that started on a different page (e.g. someone scanned
  // a paystub from the Bills or Debts page) -- SmartCapture there detected
  // it was really Income and sent the user here with the fields already
  // extracted, via lib/capturePrefill.ts, rather than making them re-enter
  // everything or re-scan.
  useEffect(() => {
    const prefill = consumeCapturePrefill('income')
    if (prefill) handleExtractedIncome(prefill)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startEdit(i: Income) {
    setEditingId(i.id)
    setEditSource(i.name ?? '')
    setEditAmount(String(i.amount ?? ''))
    setEditFrequency(i.frequency ?? 'monthly')
    setEditNextPayDate(i.next_pay_date ?? '')
    setEditIsTransfer(i.income_type === TRANSFER_TYPE)
  }

  async function saveEdit(id: string) {
    if (!editSource || !editAmount) {
      alert('Please enter a source and amount')
      return
    }
    try {
      const { error } = await supabase
        .from('income')
        .update({
          name: editSource,
          amount: Number(editAmount),
          frequency: editFrequency,
          income_type: editIsTransfer ? TRANSFER_TYPE : null,
          next_pay_date: editNextPayDate || null,
        })
        .eq('id', id)
      if (error) throw error
      setEditingId(null)
      loadIncome()
    } catch (error) {
      console.error('Error updating income:', error)
      alert('Failed to save changes')
    }
  }

  async function deleteIncome(id: string) {
    try {
      const { error } = await supabase.from('income').delete().eq('id', id)
      if (error) throw error
      loadIncome()
    } catch (error) {
      console.error('Error deleting income:', error)
      alert('Failed to delete income')
    }
  }

  const realIncomeItems = items.filter((i) => i.income_type !== TRANSFER_TYPE)
  const transferItems = items.filter((i) => i.income_type === TRANSFER_TYPE)
  const monthlyTotal = realIncomeItems.reduce(
    (sum, i) => sum + (Number(i.amount) || 0) * monthlyFactor(i.frequency),
    0
  )
  const monthlyTransfersExcluded = transferItems.reduce(
    (sum, i) => sum + (Number(i.amount) || 0) * monthlyFactor(i.frequency),
    0
  )

  const detailInputClass =
    'mt-1 w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 text-sm'

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-2">Income</h1>
        <p className="text-gray-300 mb-8">
          Keep your income up to date so your safe-to-spend stays accurate.
        </p>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Add form */}
          <div className="lg:col-span-1">
            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6 sticky top-6">
              <h2 className="text-2xl font-bold mb-6">Add Income</h2>
              <form onSubmit={addIncome} className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Source</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g., Paycheck"
                    className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-2">
                    Next pay date <span className="text-gray-500">(so it shows on your Calendar)</span>
                  </label>
                  <input
                    type="date"
                    value={nextPayDate}
                    onChange={(e) => setNextPayDate(e.target.value)}
                    className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTransfer}
                    onChange={(e) => setIsTransfer(e.target.checked)}
                    className="rounded border-gray-700 bg-[#1a233a] text-green-500 focus:ring-green-500"
                  />
                  This is a transfer between my own accounts (not income)
                </label>

                {/* Optional paycheck breakdown */}
                <label className="flex items-center gap-2 text-sm text-gray-300 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDetails}
                    onChange={(e) => setShowDetails(e.target.checked)}
                    className="rounded border-gray-700 bg-[#1a233a]"
                  />
                  Add paycheck details (taxes, 401(k), etc.)
                  {showDetails ? (
                    <ChevronUp size={16} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-500" />
                  )}
                </label>

                {showDetails && (
                  <div className="rounded-lg border border-gray-700 bg-[#0b1220] p-3">
                    {/* Always-visible summary fields */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <label className="block">
                        <span className="text-gray-500 text-xs">Gross pay ($)</span>
                        <input
                          type="number"
                          step="0.01"
                          value={details.grossPay}
                          onChange={(e) => setDetails({ ...details, grossPay: e.target.value })}
                          placeholder="0.00"
                          className={detailInputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-gray-500 text-xs">Net pay ($)</span>
                        <input
                          type="number"
                          step="0.01"
                          value={details.netPay}
                          onChange={(e) => setDetails({ ...details, netPay: e.target.value })}
                          placeholder="0.00"
                          className={detailInputClass}
                        />
                      </label>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mb-3 border-b border-gray-700">
                      {(['taxes', 'deductions'] as DetailsTab[]).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setDetailsTab(tab)}
                          className={`px-3 py-1.5 text-sm font-medium capitalize border-b-2 -mb-px transition ${
                            detailsTab === tab
                              ? 'border-emerald-400 text-emerald-400'
                              : 'border-transparent text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {detailsTab === 'taxes' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-gray-500 text-xs">Federal tax ($)</span>
                          <input
                            type="number"
                            step="0.01"
                            value={details.federalTax}
                            onChange={(e) => setDetails({ ...details, federalTax: e.target.value })}
                            placeholder="0.00"
                            className={detailInputClass}
                          />
                        </label>
                        <label className="block">
                          <span className="text-gray-500 text-xs">State tax ($)</span>
                          <input
                            type="number"
                            step="0.01"
                            value={details.stateTax}
                            onChange={(e) => setDetails({ ...details, stateTax: e.target.value })}
                            placeholder="0.00"
                            className={detailInputClass}
                          />
                        </label>
                        <label className="block">
                          <span className="text-gray-500 text-xs">Social Security ($)</span>
                          <input
                            type="number"
                            step="0.01"
                            value={details.socialSecurity}
                            onChange={(e) => setDetails({ ...details, socialSecurity: e.target.value })}
                            placeholder="0.00"
                            className={detailInputClass}
                          />
                        </label>
                        <label className="block">
                          <span className="text-gray-500 text-xs">Medicare ($)</span>
                          <input
                            type="number"
                            step="0.01"
                            value={details.medicare}
                            onChange={(e) => setDetails({ ...details, medicare: e.target.value })}
                            placeholder="0.00"
                            className={detailInputClass}
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-gray-500 text-xs">401(k) ($)</span>
                          <input
                            type="number"
                            step="0.01"
                            value={details.retirement401k}
                            onChange={(e) => setDetails({ ...details, retirement401k: e.target.value })}
                            placeholder="0.00"
                            className={detailInputClass}
                          />
                        </label>
                        <label className="block">
                          <span className="text-gray-500 text-xs">Health insurance ($)</span>
                          <input
                            type="number"
                            step="0.01"
                            value={details.healthInsurance}
                            onChange={(e) => setDetails({ ...details, healthInsurance: e.target.value })}
                            placeholder="0.00"
                            className={detailInputClass}
                          />
                        </label>
                        <label className="block col-span-2">
                          <span className="text-gray-500 text-xs">Other deductions ($)</span>
                          <input
                            type="number"
                            step="0.01"
                            value={details.otherDeductions}
                            onChange={(e) => setDetails({ ...details, otherDeductions: e.target.value })}
                            placeholder="0.00"
                            className={detailInputClass}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Plus size={20} /> Add Income
                </button>
              </form>

              {/* Photo capture (real Claude-vision extraction) */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                {showCapture ? (
                  <SmartCapture docType="income" onExtracted={handleExtractedIncome} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCapture(true)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    Scan a paycheck stub
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Total Monthly Income</p>
                <p className="text-3xl font-bold text-green-400">
                  {formatMoney(monthlyTotal)}
                </p>
                {transferItems.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {transferItems.length} transfer{transferItems.length === 1 ? '' : 's'} excluded (
                    {formatMoney(monthlyTransfersExcluded)}/mo)
                  </p>
                )}
              </div>
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Income Sources</p>
                <p className="text-3xl font-bold text-blue-400">{realIncomeItems.length}</p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading income...</div>
            ) : items.length > 0 ? (
              <div className="space-y-3">
                {items.map((i) => (
                  <div
                    key={i.id}
                    className="bg-[#0f172a] border border-gray-700 rounded-lg p-4"
                  >
                    {editingId === i.id ? (
                      <div className="space-y-3">
                        <input
                          value={editSource}
                          onChange={(e) => setEditSource(e.target.value)}
                          placeholder="Source"
                          className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-gray-500 text-xs block mb-1">Amount ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-gray-500 text-xs block mb-1">Frequency</label>
                            <select
                              value={editFrequency}
                              onChange={(e) => setEditFrequency(e.target.value)}
                              className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white"
                            >
                              {FREQUENCIES.map((f) => (
                                <option key={f.value} value={f.value}>
                                  {f.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-gray-500 text-xs block mb-1">Next pay date</label>
                          <input
                            type="date"
                            value={editNextPayDate}
                            onChange={(e) => setEditNextPayDate(e.target.value)}
                            className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editIsTransfer}
                            onChange={(e) => setEditIsTransfer(e.target.checked)}
                            className="rounded border-gray-700 bg-[#1a233a] text-green-500 focus:ring-green-500"
                          />
                          This is a transfer between my own accounts (not income)
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(i.id)}
                            className="flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-green-600"
                          >
                            <Check size={16} /> Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-[#1a233a]"
                          >
                            <X size={16} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          {i.income_type === TRANSFER_TYPE ? (
                            <ArrowLeftRight size={16} className="text-gray-500" />
                          ) : (
                            <Wallet size={16} className="text-green-400" />
                          )}
                          {i.name}
                          {i.income_type === TRANSFER_TYPE && (
                            <span className="text-xs font-normal text-gray-400 bg-[#1a233a] rounded-full px-2 py-0.5">
                              Transfer &middot; not counted as income
                            </span>
                          )}
                        </h3>
                        <p className="text-gray-400 text-sm capitalize">{i.frequency}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${i.income_type === TRANSFER_TYPE ? 'text-gray-400' : 'text-green-400'}`}>
                            {formatMoney(Number(i.amount))}
                          </p>
                          <p className="text-xs text-gray-500">
                            ~{formatMoney(Number(i.amount) * monthlyFactor(i.frequency))}/mo
                          </p>
                        </div>
                        <button
                          onClick={() => startEdit(i)}
                          className="text-gray-400 hover:text-white transition p-2"
                          aria-label="Edit"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => deleteIncome(i.id)}
                          className="text-red-400 hover:text-red-300 transition p-2"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    )}

                    {i.details && (
                      <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-400">
                        {i.details.grossPay != null && <p>Gross: {formatMoney(Number(i.details.grossPay))}</p>}
                        {i.details.federalTax != null && <p>Federal tax: {formatMoney(Number(i.details.federalTax))}</p>}
                        {i.details.stateTax != null && <p>State tax: {formatMoney(Number(i.details.stateTax))}</p>}
                        {i.details.socialSecurity != null && <p>Social Security: {formatMoney(Number(i.details.socialSecurity))}</p>}
                        {i.details.medicare != null && <p>Medicare: {formatMoney(Number(i.details.medicare))}</p>}
                        {i.details.retirement401k != null && <p>401(k): {formatMoney(Number(i.details.retirement401k))}</p>}
                        {i.details.healthInsurance != null && <p>Health insurance: {formatMoney(Number(i.details.healthInsurance))}</p>}
                        {i.details.otherDeductions != null && <p>Other: {formatMoney(Number(i.details.otherDeductions))}</p>}
                        {i.details.netPay != null && <p>Net: {formatMoney(Number(i.details.netPay))}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>No income added yet</p>
                <p className="text-sm mt-2">Add your paycheck or other income to see safe-to-spend.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
