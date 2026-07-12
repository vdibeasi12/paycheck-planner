'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, Upload } from 'lucide-react'
import BillOCR from '../components/BillOCR'
import { useRouter } from 'next/navigation'
import { isPremium } from '@/lib/permissions'

interface Bill {
  id: string
  name: string
  amount: number
  due_date: number
  created_at: string
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [showOCR, setShowOCR] = useState(false)
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState('free')
  const router = useRouter()

  async function loadBills() {
    try {
      const { data } = await supabase.from('bills').select('*')
      if (data) setBills(data)
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
        frequency: 'monthly',
      })

      if (error) throw error

      setName('')
      setAmount('')
      setDueDay('')
      loadBills()
    } catch (error) {
      console.error('Error adding bill:', error)
      alert('Failed to add bill')
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

  const totalBills = bills.reduce((sum, bill) => sum + bill.amount, 0)

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <h1 className="text-4xl font-bold mb-2">Bills & Expenses</h1>
        <p className="text-gray-300 mb-8">
          Track your monthly bills and automate payments
        </p>

        {/* OCR Section */}
        {showOCR && (
          <div className="mb-8">
            <button
              onClick={() => setShowOCR(false)}
              className="text-gray-400 hover:text-white text-sm mb-4"
            >
              ← Back to bills
            </button>
            <BillOCR />
          </div>
        )}

        {/* Main Content */}
        {!showOCR && (
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

                  <button
                    type="submit"
                    className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Plus size={20} /> Add Bill
                  </button>
                </form>

                {/* OCR Option */}
                <button
                  onClick={() => { if (isPremium(plan)) { setShowOCR(true) } else { router.push('/pricing') } }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Upload size={20} /> Upload Bill Image
                </button>
              </div>
            </div>

            {/* Bills List */}
            <div className="lg:col-span-2">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Total Monthly Bills</p>
                  <p className="text-3xl font-bold text-green-400">
                    ${totalBills.toFixed(2)}
                  </p>
                </div>
                <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Number of Bills</p>
                  <p className="text-3xl font-bold text-blue-400">{bills.length}</p>
                </div>
              </div>

              {/* Bills Table */}
              {loading ? (
                <div className="text-center py-12 text-gray-400">Loading bills...</div>
              ) : bills.length > 0 ? (
                <div className="space-y-3">
                  {bills
                    .sort((a, b) => a.due_date - b.due_date)
                    .map((bill) => (
                      <div
                        key={bill.id}
                        className="bg-[#0f172a] border border-gray-700 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div>
                          <h3 className="font-semibold text-lg">{bill.name}</h3>
                          <p className="text-gray-400 text-sm">
                            Due on day {bill.due_date} of each month
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-400">
                              ${Number(bill.amount).toFixed(2)}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteBill(bill.id)}
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
                  <p>No bills added yet</p>
                  <p className="text-sm mt-2">Add a bill manually or upload a bill image</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
