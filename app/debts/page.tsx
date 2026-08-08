'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, CreditCard, Pencil, Check, X, Lock, Camera } from 'lucide-react'
import { getMaxDebts } from '@/lib/permissions'
import SmartCapture from '../components/SmartCapture'
import { useFormatCurrency } from '@/lib/i18n/formatCurrency'
import { simulate, strategiesTie, type Strategy } from '@/lib/payoffSimulate'

interface Debt {
  id: string
  name: string
  balance: number
  interest_rate: number
  minimum_payment: number
  created_at: string
}

type EditState = {
  name: string
  balance: string
  interest_rate: string
  minimum_payment: string
}

const EMPTY_EDIT: EditState = { name: '', balance: '', interest_rate: '', minimum_payment: '' }

export default function DebtsPage() {
  const formatMoney = useFormatCurrency()
  const [items, setItems] = useState<Debt[]>([])
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [rate, setRate] = useState('')
  const [minPayment, setMinPayment] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState>(EMPTY_EDIT)
  const [plan, setPlan] = useState<string>('free')
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [showCapture, setShowCapture] = useState(false)
  const [strategy, setStrategy] = useState<Strategy>('snowball')
  const [extraText, setExtraText] = useState('0')
  const extra = Math.max(0, Number(extraText) || 0)

  async function loadPlan() {
    try {
      const { data: userAuth } = await supabase.auth.getUser()
      if (!userAuth.user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, is_admin')
        .eq('id', userAuth.user.id)
        .maybeSingle()
      if (profile) {
        setPlan((profile.plan as string) || 'free')
        setIsAdmin(!!profile.is_admin)
      }
    } catch (error) {
      console.error('Error loading plan:', error)
    }
  }

  async function loadDebts() {
    try {
      const { data } = await supabase
        .from('debts')
        .select('id, name, balance, interest_rate, minimum_payment, created_at')
        .order('balance', { ascending: true })
      if (data) setItems(data as Debt[])
    } catch (error) {
      console.error('Error loading debts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDebts()
    loadPlan()
  }, [])

  async function addDebt(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !balance) {
      alert('Please enter at least a name and balance')
      return
    }
    try {
      const { data: userAuth } = await supabase.auth.getUser()
      if (!userAuth.user) {
        alert('You must be logged in to add a debt')
        return
      }
      const limit = isAdmin ? Infinity : getMaxDebts(plan)
      if (items.length >= limit) {
        alert(
          'You have reached your plan limit of ' +
            limit +
            ' debts. Upgrade your plan to track more.'
        )
        return
      }
      const { error } = await supabase.from('debts').insert({
        user_id: userAuth.user.id,
        name,
        balance: Number(balance),
        original_balance: Number(balance),
        interest_rate: rate === '' ? 0 : Number(rate),
        minimum_payment: minPayment === '' ? 0 : Number(minPayment),
      })
      if (error) throw error
      setName('')
      setBalance('')
      setRate('')
      setMinPayment('')
      loadDebts()
    } catch (error) {
      console.error('Error adding debt:', error)
      alert('Failed to add debt')
    }
  }

  function handleExtractedDebt(fields: {
    name: string | null
    balance: number | null
    interest_rate: number | null
    minimum_payment: number | null
  }) {
    if (fields.name) setName(fields.name)
    if (fields.balance != null) setBalance(String(fields.balance))
    if (fields.interest_rate != null) setRate(String(fields.interest_rate))
    if (fields.minimum_payment != null) setMinPayment(String(fields.minimum_payment))
    setShowCapture(false)
  }

  function startEdit(d: Debt) {
    setEditingId(d.id)
    setEdit({
      name: d.name ?? '',
      balance: String(d.balance ?? ''),
      interest_rate: String(d.interest_rate ?? ''),
      minimum_payment: String(d.minimum_payment ?? ''),
    })
  }

  async function saveEdit(id: string) {
    try {
      const { error } = await supabase
        .from('debts')
        .update({
          name: edit.name,
          balance: Number(edit.balance) || 0,
          interest_rate: edit.interest_rate === '' ? 0 : Number(edit.interest_rate),
          minimum_payment: edit.minimum_payment === '' ? 0 : Number(edit.minimum_payment),
        })
        .eq('id', id)
      if (error) throw error
      setEditingId(null)
      loadDebts()
    } catch (error) {
      console.error('Error updating debt:', error)
      alert('Failed to save changes')
    }
  }

  async function deleteDebt(id: string) {
    if (!window.confirm('Delete this debt?')) return
    try {
      const { error } = await supabase.from('debts').delete().eq('id', id)
      if (error) throw error
      loadDebts()
    } catch (error) {
      console.error('Error deleting debt:', error)
      alert('Failed to delete debt')
    }
  }

  const maxDebts = isAdmin ? Infinity : getMaxDebts(plan)
  const unlimited = !isFinite(maxDebts) || maxDebts >= 999999
  const atLimit = !unlimited && items.length >= maxDebts

  const totalBalance = items.reduce((sum, d) => sum + (Number(d.balance) || 0), 0)
  const totalMin = items.reduce((sum, d) => sum + (Number(d.minimum_payment) || 0), 0)
  const avgApr =
    totalBalance > 0
      ? items.reduce((sum, d) => sum + (Number(d.balance) || 0) * (Number(d.interest_rate) || 0), 0) /
        totalBalance
      : 0

  // The list below is ordered by the selected payoff strategy, not just
  // insertion order -- Snowball shows smallest balance first, Avalanche
  // shows highest interest rate first. This is the actual "tackle this one
  // first" order the strategy implies, separate from the aggregate totals
  // shown in the widget above (which can tie even when this list doesn't,
  // or vice versa, depending on the debt set).
  const sortedItems = useMemo(() => {
    const copy = [...items]
    if (strategy === 'snowball') {
      copy.sort((a, b) => (Number(a.balance) || 0) - (Number(b.balance) || 0))
    } else {
      copy.sort((a, b) => (Number(b.interest_rate) || 0) - (Number(a.interest_rate) || 0))
    }
    return copy
  }, [items, strategy])

  const inputClass =
    'w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500'

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-2">Debts</h1>
        <p className="text-gray-300 mb-8">
          Add and update your debts. Enter the APR as a percent (e.g. 19.99) so your payoff plan is accurate.
        </p>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Add form */}
          <div className="lg:col-span-1">
            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6 sticky top-6">
              <h2 className="text-2xl font-bold mb-6">Add Debt</h2>
              <form onSubmit={addDebt} className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Visa card"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-2">APR (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="19.99"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Minimum payment ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={minPayment}
                    onChange={(e) => setMinPayment(e.target.value)}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  disabled={atLimit}
                  className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-500"
                >
                  <Plus size={20} /> Add Debt
                </button>
              </form>

              {/* Photo capture (real Claude-vision extraction) */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                {showCapture ? (
                  <SmartCapture docType="debt" onExtracted={handleExtractedDebt} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCapture(true)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Camera size={20} /> Scan a statement photo
                  </button>
                )}
              </div>

              <p className="text-gray-500 text-xs mt-4">
                {unlimited
                  ? items.length + ' debts tracked - unlimited on your plan'
                  : items.length + ' of ' + maxDebts + ' debts used on your plan'}
              </p>

              {atLimit && (
                <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                    <Lock size={14} /> Plan limit reached
                  </p>
                  <p className="mt-1 text-xs text-amber-200/80">
                    You are tracking the maximum of {maxDebts} debts on your current plan.
                  </p>
                  <Link
                    href="/pricing"
                    className="mt-2 inline-block rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-400"
                  >
                    Upgrade to track more
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* List */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Total Balance</p>
                <p className="text-2xl font-bold text-rose-400">{formatMoney(totalBalance)}</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Min / month</p>
                <p className="text-2xl font-bold text-blue-400">{formatMoney(totalMin)}</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Avg APR</p>
                <p className="text-2xl font-bold text-amber-400">{avgApr.toFixed(2)}%</p>
              </div>
            </div>

            {items.length > 0 && (() => {
              const start = new Date()
              const sim = simulate(
                items.map((d) => ({
                  id: d.id,
                  name: d.name,
                  balance: Number(d.balance) || 0,
                  interest_rate: Number(d.interest_rate) || 0,
                  minimum_payment: Number(d.minimum_payment) || 0,
                })),
                strategy,
                extra,
                start
              )
              const debtFreeLabel =
                sim.months > 0 && !sim.nonAmortizing
                  ? new Date(start.getFullYear(), start.getMonth() + sim.months - 1, 1).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : '-'
              const tied = strategiesTie(items)
              return (
                <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-gray-700 bg-[#0f172a] p-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
                      Strategy
                    </label>
                    <div className="inline-flex rounded-lg border border-gray-700 bg-[#1a233a] p-1">
                      <button
                        type="button"
                        onClick={() => setStrategy('snowball')}
                        className={
                          'rounded-md px-3 py-1.5 text-sm transition ' +
                          (strategy === 'snowball'
                            ? 'bg-green-500 font-medium text-black'
                            : 'text-gray-300 hover:text-white')
                        }
                      >
                        Snowball
                      </button>
                      <button
                        type="button"
                        onClick={() => setStrategy('avalanche')}
                        className={
                          'rounded-md px-3 py-1.5 text-sm transition ' +
                          (strategy === 'avalanche'
                            ? 'bg-green-500 font-medium text-black'
                            : 'text-gray-300 hover:text-white')
                        }
                      >
                        Avalanche
                      </button>
                    </div>
                    {tied && (
                      <p className="mt-1.5 max-w-[220px] text-xs text-gray-500">
                        Same result either way -- your highest-rate debt is also your
                        smallest balance.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
                      Extra monthly payment
                    </label>
                    <div className="flex items-center rounded-lg border border-gray-700 bg-[#1a233a] px-3">
                      <span className="text-gray-400">$</span>
                      <input
                        type="number"
                        min={0}
                        step={25}
                        value={extraText}
                        onFocus={() => {
                          if (extraText === '0') setExtraText('')
                        }}
                        onBlur={() => {
                          if (extraText.trim() === '') setExtraText('0')
                        }}
                        onChange={(e) => setExtraText(e.target.value)}
                        className="w-24 bg-transparent px-2 py-1.5 text-white outline-none placeholder:text-gray-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="ml-auto flex gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Debt-free</p>
                      <p className="text-lg font-bold text-emerald-400">{debtFreeLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Total interest</p>
                      <p className="text-lg font-bold text-white">
                        {sim.nonAmortizing ? '-' : formatMoney(Math.round(sim.totalInterest))}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading debts...</div>
            ) : items.length > 0 ? (
              <div className="space-y-3">
                {sortedItems.map((d, idx) => (
                  <div key={d.id} className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                    {editingId === d.id ? (
                      <div className="space-y-3">
                        <input
                          value={edit.name}
                          onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                          placeholder="Name"
                          className={inputClass}
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-gray-500 text-xs block mb-1">Balance</label>
                            <input
                              type="number"
                              step="0.01"
                              value={edit.balance}
                              onChange={(e) => setEdit({ ...edit, balance: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="text-gray-500 text-xs block mb-1">APR %</label>
                            <input
                              type="number"
                              step="0.01"
                              value={edit.interest_rate}
                              onChange={(e) => setEdit({ ...edit, interest_rate: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="text-gray-500 text-xs block mb-1">Min</label>
                            <input
                              type="number"
                              step="0.01"
                              value={edit.minimum_payment}
                              onChange={(e) => setEdit({ ...edit, minimum_payment: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(d.id)}
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
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-400">
                              {idx + 1}
                            </span>
                            <CreditCard size={16} className="text-rose-400" /> {d.name}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {Number(d.interest_rate).toFixed(2)}% APR
                            {Number(d.minimum_payment) > 0
                              ? ` - min ${formatMoney(Number(d.minimum_payment))}/mo`
                              : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-2xl font-bold text-rose-400">
                            {formatMoney(Number(d.balance))}
                          </p>
                          <button
                            onClick={() => startEdit(d)}
                            className="text-gray-400 hover:text-white transition p-2"
                            aria-label="Edit"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => deleteDebt(d.id)}
                            className="text-red-400 hover:text-red-300 transition p-2"
                            aria-label="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>No debts added yet</p>
                <p className="text-sm mt-2">Add your first debt to build a payoff plan.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}