'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Wallet, CreditCard, CalendarDays } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { occurrencesInMonth, billOccurrenceInMonth, type Frequency } from '@/lib/schedule'

interface DebtRow {
  id: string
  name: string
  minimum_payment: number
  due_date: number | null
}

interface IncomeRow {
  id: string
  source: string
  amount: number
  frequency: string
  next_pay_date: string | null
}

interface PeekEvent {
  date: string
  type: 'income' | 'debt'
  name: string
  amount: number
}

const LOOKAHEAD_DAYS = 30

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Occurrences for "this month and next" covers any 30-day lookahead window
// regardless of where in the month today happens to fall.
function upcomingOccurrences(
  debts: DebtRow[],
  income: IncomeRow[]
): PeekEvent[] {
  const now = new Date()
  const windows = [
    { year: now.getFullYear(), month: now.getMonth() },
    { year: now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(), month: (now.getMonth() + 1) % 12 },
  ]

  const today = todayISO()
  const cutoff = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000)
  const cutoffISO = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(
    cutoff.getDate()
  ).padStart(2, '0')}`

  const list: PeekEvent[] = []

  for (const w of windows) {
    for (const debt of debts) {
      if (!debt.due_date) continue
      const date = billOccurrenceInMonth(debt.due_date, w.year, w.month)
      if (date >= today && date <= cutoffISO) {
        list.push({ date, type: 'debt', name: debt.name, amount: Number(debt.minimum_payment) || 0 })
      }
    }
    for (const inc of income) {
      const dates = occurrencesInMonth(inc.next_pay_date, inc.frequency as Frequency, w.year, w.month)
      for (const date of dates) {
        if (date >= today && date <= cutoffISO) {
          list.push({ date, type: 'income', name: inc.source, amount: Number(inc.amount) || 0 })
        }
      }
    }
  }

  // De-dupe in case a debt/income landed in both scanned windows.
  const seen = new Set<string>()
  const deduped = list.filter((e) => {
    const key = `${e.type}-${e.name}-${e.date}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return deduped.sort((a, b) => a.date.localeCompare(b.date))
}

export default function CalendarPeek({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false)
  const [debts, setDebts] = useState<DebtRow[]>([])
  const [income, setIncome] = useState<IncomeRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open || loaded) return
    let active = true
    setLoading(true)
    async function load() {
      try {
        const [debtsRes, incomeRes] = await Promise.all([
          supabase.from('debts').select('id, name, minimum_payment, due_date'),
          supabase.from('income').select('id, source, amount, frequency, next_pay_date'),
        ])
        if (!active) return
        if (debtsRes.data) setDebts(debtsRes.data as DebtRow[])
        if (incomeRes.data) setIncome(incomeRes.data as IncomeRow[])
        setLoaded(true)
      } catch (error) {
        console.error('Error loading calendar peek:', error)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [open, loaded])

  const events = upcomingOccurrences(debts, income)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-medium text-gray-300 transition hover:bg-white/5 hover:text-white"
      >
        <CalendarDays size={20} className="text-gray-400" />
        Upcoming (30 days)
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 right-0 flex w-80 max-w-[85%] flex-col border-l border-gray-800 bg-[#0b1220] shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
              <h2 className="text-lg font-bold text-white">Next 30 days</h2>
              <button
                onClick={() => setOpen(false)}
                className="-mr-2 p-2 text-gray-300"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : events.length > 0 ? (
                <div className="space-y-2">
                  {events.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0f172a] px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        {e.type === 'income' ? (
                          <Wallet size={16} className="text-emerald-400 shrink-0" />
                        ) : (
                          <CreditCard size={16} className="text-amber-400 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-100">{e.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`text-sm font-bold shrink-0 ${
                          e.type === 'income' ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {e.type === 'income' ? '+' : '-'}${e.amount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Nothing coming up in the next 30 days. If that seems wrong, make sure your income
                  and debts have a pay date / due day set.
                </p>
              )}
            </div>

            <div className="border-t border-gray-800 p-4">
              <Link
                href="/calendar"
                onClick={() => {
                  setOpen(false)
                  onNavigate?.()
                }}
                className="block w-full rounded-lg bg-green-500 px-4 py-2.5 text-center text-sm font-semibold text-black transition hover:bg-green-600"
              >
                Open full calendar
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
