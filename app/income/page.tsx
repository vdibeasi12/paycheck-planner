'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, Wallet } from 'lucide-react'
import SmartCapture from '@/components/SmartCapture'

interface Income {
  id: string
  source: string
  amount: number
  frequency: string
  created_at: string
}

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
]

// Keep these in sync with the dashboard's monthlyFactor so the safe-to-spend
// figure matches what users see here.
function monthlyFactor(freq: string): number {
  switch (freq) {
    case 'weekly':
      return 52 / 12
    case 'biweekly':
      return 26 / 12
    case 'quarterly':
      return 1 / 3
    case 'annual':
      return 1 / 12
    default:
      return 1 // monthly
  }
}

export default function IncomePage() {
  const [items, setItems] = useState<Income[]>([])
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [loading, setLoading] = useState(true)
  const [showCapture, setShowCapture] = useState(false)

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

  async function addIncome(e: React.FormEvent) {
    e.preventDefault()
    if (!source || !amount) {
      alert('Please enter a source and amount')
      return
    }
    try {
      const { data: userAuth } = await supabase.auth.getUser()
      if (!userAuth.user) {
        alert('You must be logged in to add income')
        return
      }
      const { error } = await supabase.from('income').insert({
        user_id: userAuth.user.id,
        source,
        amount: Number(amount),
        frequency,
      })
      if (error) throw error
      setSource('')
      setAmount('')
      setFrequency('monthly')
      loadIncome()
    } catch (error) {
      console.error('Error adding income:', error)
      alert('Failed to add income')
    }
  }

  const VALID_FREQUENCIES = new Set(FREQUENCIES.map((f) => f.value))

  function handleExtractedIncome(fields: { name: string | null; amount: number | null; frequency: string | null }) {
    if (fields.name) setSource(fields.name)
    if (fields.amount != null) setAmount(String(fields.amount))
    if (fields.frequency && VALID_FREQUENCIES.has(fields.frequency)) {
      setFrequency(fields.frequency)
    }
    setShowCapture(false)
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

  const monthlyTotal = items.reduce(
    (sum, i) => sum + (Number(i.amount) || 0) * monthlyFactor(i.frequency),
    0
  )

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
                  ${monthlyTotal.toFixed(2)}
                </p>
              </div>
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Sources</p>
                <p className="text-3xl font-bold text-blue-400">{items.length}</p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading income...</div>
            ) : items.length > 0 ? (
              <div className="space-y-3">
                {items.map((i) => (
                  <div
                    key={i.id}
                    className="bg-[#0f172a] border border-gray-700 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Wallet size={16} className="text-green-400" /> {i.source}
                      </h3>
                      <p className="text-gray-400 text-sm capitalize">{i.frequency}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-400">
                          ${Number(i.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          ~${(Number(i.amount) * monthlyFactor(i.frequency)).toFixed(2)}/mo
                        </p>
                      </div>
                      <button
                        onClick={() => deleteIncome(i.id)}
                        className="text-red-400 hover:text-red-300 transition p-2"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
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
