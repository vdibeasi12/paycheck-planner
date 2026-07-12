'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, CreditCard, Pencil, Check, X, Lock } from 'lucide-react'
import { getMaxDebts } from '@/lib/permissions'

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
                <p className="text-2xl font-bold text-rose-400">${totalBalance.toFixed(2)}</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Min / month</p>
                <p className="text-2xl font-bold text-blue-400">${totalMin.toFixed(2)}</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Avg APR</p>
                <p className="text-2xl font-bold text-amber-400">{avgApr.toFixed(2)}%</p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading debts...</div>
            ) : items.length > 0 ? (
              <div className="space-y-3">
                {items.map((d) => (
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
                            <CreditCard size={16} className="text-rose-400" /> {d.name}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {Number(d.interest_rate).toFixed(2)}% APR
                            {Number(d.minimum_payment) > 0
                              ? ` - min $${Number(d.minimum_payment).toFixed(2)}/mo`
                              : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-2xl font-bold text-rose-400">
                            ${Number(d.balance).toFixed(2)}
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