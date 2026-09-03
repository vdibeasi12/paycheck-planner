'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, Upload, Pencil, Check, X, FileSpreadsheet, Receipt, Repeat } from 'lucide-react'
import SmartCapture from '../components/SmartCapture'
import { useRouter } from 'next/navigation'
import { isPremium } from '@/lib/permissions'
import { useFormatCurrency } from '@/lib/i18n/formatCurrency'
import { monthlyFactor } from '@/lib/monthlyFactor'
import { findBillDebtOverlaps } from '@/lib/billDebtOverlap'
import BillsVsDebtsHint from '../components/BillsVsDebtsHint'
import { consumeCapturePrefill } from '@/lib/capturePrefill'
import { checkAchievementsAndCelebrate } from '@/lib/checkAchievements'

interface Bill {
  id: string
  name: string
  amount: number
  due_date: number
  category: string | null
  frequency?: string | null
  created_at: string
}

interface DebtRef {
  id: string
  name: string
}

// A bill is treated as a subscription purely by category tag -- CSV import
// already auto-tags Netflix/Spotify/iCloud/etc. as "Subscriptions" (see
// CATEGORY_RULES in lib/csvImport.ts); manually-added bills get the same tag
// via the "This is a subscription" checkbox below. Everything else (or
// uncategorized/legacy rows) renders under the Bills tab.
const SUBSCRIPTION_CATEGORY = 'Subscriptions'

export default function BillsPage() {
  const formatMoney = useFormatCurrency()
  const [bills, setBills] = useState<Bill[]>([])
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [frequency, setFrequency] = useState<'monthly' | 'bimonthly'>('monthly')
  const [isSubscription, setIsSubscription] = useState(false)
  const [showCapture, setShowCapture] = useState(false)
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState('free')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDueDay, setEditDueDay] = useState('')
  const [editFrequency, setEditFrequency] = useState<'monthly' | 'bimonthly'>('monthly')
  const [editIsSubscription, setEditIsSubscription] = useState(false)
  const [editOriginalCategory, setEditOriginalCategory] = useState<string | null>(null)
  const [tab, setTab] = useState<'bills' | 'subscriptions'>('bills')
  const [debts, setDebts] = useState<DebtRef[]>([])
  const router = useRouter()

  const subscriptionBills = useMemo(
    () => bills.filter((b) => b.category === SUBSCRIPTION_CATEGORY),
    [bills]
  )
  const regularBills = useMemo(
    () => bills.filter((b) => b.category !== SUBSCRIPTION_CATEGORY),
    [bills]
  )
  const visibleBills = tab === 'subscriptions' ? subscriptionBills : regularBills

  const monthlyBillsTotal = regularBills.reduce(
    (sum, b) => sum + Number(b.amount) * monthlyFactor(b.frequency),
    0
  )
  const monthlySubscriptionsTotal = subscriptionBills.reduce(
    (sum, b) => sum + Number(b.amount) * monthlyFactor(b.frequency),
    0
  )
  const combinedMonthlyTotal = monthlyBillsTotal + monthlySubscriptionsTotal

  async function loadBills() {
    try {
      const { data } = await supabase.from('bills').select('*')
      if (data) setBills(data)
      // Only id/name are needed here -- this is purely for the duplicate-
      // with-a-debt warning below, not for anything debt-specific.
      const { data: debtsData } = await supabase.from('debts').select('id, name')
      if (debtsData) setDebts(debtsData)
      const { data: auth } = await supabase.auth.getUser()
      if (auth.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', auth.user.id)
          .maybeSingle()
        if (profile?.plan) setPlan(profile.plan)
      }
    } catch (error) {
      console.error('Error loading bills:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBills()
  }, [])

  async function addBill(e: React.FormEvent) {
    e.preventDefault()

    if (!name || !amount || !dueDay) {
      alert('Please fill in all fields')
      return
    }

    // QA fix (Aug 15 2026): a mortgage/auto/student loan tracked in Debts
    // has a real payoff plan there -- adding it here too as a recurring
    // bill double-counts that payment anywhere bills and debt payments get
    // summed together (e.g. Safe-to-Spend). Warn before inserting rather
    // than silently letting it happen; the user can still proceed if this
    // genuinely isn't the same payment.
    const overlap = findBillDebtOverlaps([{ name }], debts)[0]
    if (overlap) {
      const proceed = window.confirm(
        `"${overlap.debt.name}" is already tracked as a debt with its own payoff plan. ` +
          `If this bill is that same loan/mortgage payment, add it in Debts instead so it isn't counted twice.\n\n` +
          `Click OK only if this is a genuinely different bill.`
      )
      if (!proceed) return
    }

    try {
      const { data: userAuth } = await supabase.auth.getUser()
      if (!userAuth.user) {
        alert('You must be logged in to add a bill')
        return
      }

      const { error } = await supabase.from('bills').insert({
        user_id: userAuth.user.id,
        name,
        amount: Number(amount),
        due_date: Number(dueDay),
        frequency,
        category: isSubscription ? SUBSCRIPTION_CATEGORY : null,
      })

      if (error) throw error

      setName('')
      setAmount('')
      setDueDay('')
      setFrequency('monthly')
      setIsSubscription(false)
      loadBills()
      // First bill added earns "bill_organizer" (and possibly "all_set" /
      // "first_month_budgeted" if income + debts are already in place) --
      // check right now instead of waiting for a later dashboard visit.
      checkAchievementsAndCelebrate()
    } catch (error) {
      console.error('Error adding bill:', error)
      alert('Failed to add bill')
    }
  }

  function handleExtractedBill(fields: { name: string | null; amount: number | null; dueDate: string | null }) {
    if (fields.name) setName(fields.name)
    if (fields.amount != null) setAmount(String(fields.amount))
    if (fields.dueDate) {
      // Bills store only the day-of-month (1-31); derive it from the full
      // extracted date. Parsed as UTC to avoid local-timezone day-shift.
      const parsed = new Date(fields.dueDate + 'T00:00:00Z')
      if (!isNaN(parsed.getTime())) {
        setDueDay(String(parsed.getUTCDate()))
      }
    }
    setShowCapture(false)
  }

  // Picks up a scan that started on a different page (e.g. someone scanned
  // a Netflix receipt from the Debts page) -- SmartCapture there detected
  // it was really a Bill and sent the user here with the fields already
  // extracted, via lib/capturePrefill.ts, rather than making them re-enter
  // everything or re-scan.
  useEffect(() => {
    const prefill = consumeCapturePrefill('bill')
    if (prefill) handleExtractedBill(prefill)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startEdit(bill: Bill) {
    setEditingId(bill.id)
    setEditName(bill.name ?? '')
    setEditAmount(String(bill.amount ?? ''))
    setEditDueDay(String(bill.due_date ?? ''))
    setEditFrequency(bill.frequency === 'bimonthly' ? 'bimonthly' : 'monthly')
    setEditIsSubscription(bill.category === SUBSCRIPTION_CATEGORY)
    setEditOriginalCategory(bill.category ?? null)
  }

  async function saveEdit(id: string) {
    if (!editName || !editAmount || !editDueDay) {
      alert('Please fill in all fields')
      return
    }
    try {
      // Flipping the checkbox moves a bill in/out of the Subscriptions tab.
      // Leaving it as-is preserves whatever category it already had (e.g. a
      // CSV-detected "Housing"/"Utilities" tag) instead of wiping it.
      const category = editIsSubscription
        ? SUBSCRIPTION_CATEGORY
        : editOriginalCategory === SUBSCRIPTION_CATEGORY
          ? null
          : editOriginalCategory
      const { error } = await supabase
        .from('bills')
        .update({
          name: editName,
          amount: Number(editAmount),
          due_date: Number(editDueDay),
          frequency: editFrequency,
          category,
        })
        .eq('id', id)
      if (error) throw error
      setEditingId(null)
      loadBills()
    } catch (error) {
      console.error('Error updating bill:', error)
      alert('Failed to save changes')
    }
  }

  async function deleteBill(id: string) {
    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadBills()
    } catch (error) {
      console.error('Error deleting bill:', error)
      alert('Failed to delete bill')
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <h1 className="text-4xl font-bold mb-2">Bills & Expenses</h1>
        <p className="text-gray-300 mb-4">
          Track your monthly bills and automate payments
        </p>

        <BillsVsDebtsHint page="bills" />

        {/* Recurring-detection summary. Combines both tabs so the total
            reflects everything recurring, whether it's a subscription or a
            regular bill. */}
        {!loading && bills.length > 0 && (
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Repeat className="text-green-400 shrink-0" size={22} />
              <div>
                <p className="font-semibold">Recurring costs detected</p>
                <p className="text-gray-400 text-sm">
                  {subscriptionBills.length} subscription{subscriptionBills.length === 1 ? '' : 's'} and{' '}
                  {regularBills.length} recurring bill{regularBills.length === 1 ? '' : 's'} &middot; potential
                  monthly cost {formatMoney(combinedMonthlyTotal)}
                </p>
              </div>
            </div>
            {subscriptionBills.length > 0 && (
              <button
                onClick={() => setTab('subscriptions')}
                className="text-sm text-green-400 hover:text-green-300 font-semibold whitespace-nowrap"
              >
                Review subscriptions &rarr;
              </button>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
            {/* Add Bill Form */}
            <div className="lg:col-span-1">
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6 sticky top-6">
                <h2 className="text-2xl font-bold mb-6">Add Bill</h2>

                {/* Manual Entry Form */}
                <form onSubmit={addBill} className="space-y-4 mb-6 pb-6 border-b border-gray-700">
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">Bill Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Electric Bill"
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
                    <label className="text-gray-400 text-sm block mb-2">Due Day (1-31)</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                      placeholder="15"
                      className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm block mb-2">How Often</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as 'monthly' | 'bimonthly')}
                      className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="bimonthly">Every 2 months (Bi-Monthly)</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSubscription}
                      onChange={(e) => setIsSubscription(e.target.checked)}
                      className="rounded border-gray-700 bg-[#1a233a] text-green-500 focus:ring-green-500"
                    />
                    This is a subscription (Netflix, Spotify, etc.)
                  </label>

                  <button
                    type="submit"
                    className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Plus size={20} /> Add Bill
                  </button>
                </form>

                {/* Photo capture (real Claude-vision extraction) */}
                {showCapture ? (
                  <SmartCapture docType="bill" onExtracted={handleExtractedBill} />
                ) : (
                  <button
                    onClick={() => { if (isPremium(plan)) { setShowCapture(true) } else { router.push('/pricing') } }}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Upload size={20} /> Scan a bill photo
                  </button>
                )}

                {/* Bank statement import (Autopilot Phase 1: CSV; Phase D:
                    PDF) -- bulk-fill bills, income and transaction history
                    from a bank statement or export in one go. Most banks
                    hand out a PDF, not a CSV, so the PDF is the primary path
                    now -- see app/import/page.tsx and app/api/extract-statement. */}
                <button
                  onClick={() => router.push('/import')}
                  className="w-full mt-3 border border-gray-700 text-gray-200 hover:bg-[#1a233a] font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <FileSpreadsheet size={20} /> Import bank statement
                </button>
              </div>
            </div>

            {/* Bills List */}
            <div className="lg:col-span-2">
              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-gray-700">
                <button
                  onClick={() => setTab('bills')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition ${
                    tab === 'bills'
                      ? 'border-green-500 text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Receipt size={16} /> Bills
                </button>
                <button
                  onClick={() => setTab('subscriptions')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition ${
                    tab === 'subscriptions'
                      ? 'border-green-500 text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Repeat size={16} /> Subscriptions
                  {subscriptionBills.length > 0 && (
                    <span className="bg-[#1a233a] text-gray-300 text-xs rounded-full px-2 py-0.5">
                      {subscriptionBills.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">
                    {tab === 'subscriptions' ? 'Total Monthly Subscriptions' : 'Total Monthly Bills'}
                  </p>
                  <p className="text-3xl font-bold text-green-400">
                    {formatMoney(tab === 'subscriptions' ? monthlySubscriptionsTotal : monthlyBillsTotal)}
                  </p>
                </div>
                <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">
                    {tab === 'subscriptions' ? 'Number of Subscriptions' : 'Number of Bills'}
                  </p>
                  <p className="text-3xl font-bold text-blue-400">{visibleBills.length}</p>
                </div>
              </div>

              {/* Bills Table */}
              {loading ? (
                <div className="text-center py-12 text-gray-400">Loading bills...</div>
              ) : visibleBills.length > 0 ? (
                <div className="space-y-3">
                  {visibleBills
                    .sort((a, b) => a.due_date - b.due_date)
                    .map((bill) => (
                      <div
                        key={bill.id}
                        className="bg-[#0f172a] border border-gray-700 rounded-lg p-4"
                      >
                        {editingId === bill.id ? (
                          <div className="space-y-3">
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Bill name"
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
                                <label className="text-gray-500 text-xs block mb-1">Due day</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="31"
                                  value={editDueDay}
                                  onChange={(e) => setEditDueDay(e.target.value)}
                                  className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-gray-500 text-xs block mb-1">How often</label>
                              <select
                                value={editFrequency}
                                onChange={(e) => setEditFrequency(e.target.value as 'monthly' | 'bimonthly')}
                                className="w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white"
                              >
                                <option value="monthly">Monthly</option>
                                <option value="bimonthly">Every 2 months (Bi-Monthly)</option>
                              </select>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editIsSubscription}
                                onChange={(e) => setEditIsSubscription(e.target.checked)}
                                className="rounded border-gray-700 bg-[#1a233a] text-green-500 focus:ring-green-500"
                              />
                              This is a subscription
                            </label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEdit(bill.id)}
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
                              <h3 className="font-semibold text-lg">{bill.name}</h3>
                              <p className="text-gray-400 text-sm">
                                {bill.category === SUBSCRIPTION_CATEGORY ? 'Renews' : 'Due'} on day{' '}
                                {bill.due_date}{' '}
                                {bill.frequency === 'bimonthly' ? 'every 2 months' : 'of each month'}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-2xl font-bold text-green-400">
                                  {formatMoney(Number(bill.amount))}
                                </p>
                              </div>
                              <button
                                onClick={() => startEdit(bill)}
                                className="text-gray-400 hover:text-white transition p-2"
                                aria-label="Edit"
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                onClick={() => deleteBill(bill.id)}
                                className="text-red-400 hover:text-red-300 transition p-2"
                                aria-label="Delete"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  {tab === 'subscriptions' ? (
                    <>
                      <p>No subscriptions added yet</p>
                      <p className="text-sm mt-2">
                        Check &quot;This is a subscription&quot; when adding a bill, or import a bank statement
                        to auto-detect ones like Netflix and Spotify
                      </p>
                    </>
                  ) : (
                    <>
                      <p>No bills added yet</p>
                      <p className="text-sm mt-2">Add a bill manually or upload a bill image</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  )
}