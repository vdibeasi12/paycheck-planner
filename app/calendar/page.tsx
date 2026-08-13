'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, Wallet, Receipt, CreditCard, AlertCircle } from 'lucide-react'
import { occurrencesInMonth, billOccurrenceInMonth, type Frequency } from '@/lib/schedule'
import { useFormatCurrency } from '@/lib/i18n/formatCurrency'

interface BillRow {
  id: string
  name: string
  amount: number
  due_date: number | null
}

interface DebtRow {
  id: string
  name: string
  minimum_payment: number
  due_date: number | null
}

interface IncomeRow {
  id: string
  name: string
  amount: number
  frequency: string
  next_pay_date: string | null
}

interface CalendarEvent {
  date: string // 'YYYY-MM-DD'
  type: 'bill' | 'debt' | 'income'
  name: string
  amount: number
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const LOOKAHEAD_DAYS = 30

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function CalendarPage() {
  const formatMoney = useFormatCurrency()
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() } // month is 0-indexed
  })
  const [bills, setBills] = useState<BillRow[]>([])
  const [debts, setDebts] = useState<DebtRow[]>([])
  const [income, setIncome] = useState<IncomeRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [billsRes, debtsRes, incomeRes] = await Promise.all([
          supabase.from('bills').select('id, name, amount, due_date'),
          supabase.from('debts').select('id, name, minimum_payment, due_date'),
          supabase.from('income').select('id, name, amount, frequency, next_pay_date'),
        ])
        if (billsRes.data) setBills(billsRes.data as BillRow[])
        if (debtsRes.data) setDebts(debtsRes.data as DebtRow[])
        if (incomeRes.data) setIncome(incomeRes.data as IncomeRow[])
      } catch (error) {
        console.error('Error loading calendar data:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const incomeMissingDate = useMemo(() => income.some((i) => !i.next_pay_date), [income])

  // Events for the month currently shown in the grid.
  const events = useMemo(() => {
    const list: CalendarEvent[] = []

    for (const bill of bills) {
      if (!bill.due_date) continue
      const date = billOccurrenceInMonth(bill.due_date, cursor.year, cursor.month)
      list.push({ date, type: 'bill', name: bill.name, amount: Number(bill.amount) || 0 })
    }

    for (const debt of debts) {
      if (!debt.due_date) continue
      const date = billOccurrenceInMonth(debt.due_date, cursor.year, cursor.month)
      list.push({ date, type: 'debt', name: debt.name, amount: Number(debt.minimum_payment) || 0 })
    }

    for (const inc of income) {
      const dates = occurrencesInMonth(
        inc.next_pay_date,
        inc.frequency as Frequency,
        cursor.year,
        cursor.month
      )
      for (const date of dates) {
        list.push({ date, type: 'income', name: inc.name, amount: Number(inc.amount) || 0 })
      }
    }

    return list.sort((a, b) => a.date.localeCompare(b.date))
  }, [bills, debts, income, cursor])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const arr = map.get(e.date) ?? []
      arr.push(e)
      map.set(e.date, arr)
    }
    return map
  }, [events])

  // Upcoming (30 days) -- independent of which month the grid is showing,
  // always anchored to today. Same three sources as the grid (bills, debts,
  // income) so this panel and the grid never disagree about what's coming up.
  const upcoming = useMemo(() => {
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

    const list: CalendarEvent[] = []

    for (const w of windows) {
      for (const bill of bills) {
        if (!bill.due_date) continue
        const date = billOccurrenceInMonth(bill.due_date, w.year, w.month)
        if (date >= today && date <= cutoffISO) {
          list.push({ date, type: 'bill', name: bill.name, amount: Number(bill.amount) || 0 })
        }
      }
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
            list.push({ date, type: 'income', name: inc.name, amount: Number(inc.amount) || 0 })
          }
        }
      }
    }

    const seen = new Set<string>()
    const deduped = list.filter((e) => {
      const key = `${e.type}-${e.name}-${e.date}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return deduped.sort((a, b) => a.date.localeCompare(b.date))
  }, [bills, debts, income])

  const { year, month } = cursor
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = todayISO()

  const cells: Array<{ day: number; date: string } | null> = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }

  function goToMonth(delta: number) {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  function eventIcon(type: CalendarEvent['type']) {
    if (type === 'income') return <Wallet size={16} className="text-emerald-400 shrink-0" />
    if (type === 'debt') return <CreditCard size={16} className="text-amber-400 shrink-0" />
    return <Receipt size={16} className="text-rose-400 shrink-0" />
  }

  function eventColor(type: CalendarEvent['type']) {
    return type === 'income' ? 'text-emerald-400' : type === 'debt' ? 'text-amber-400' : 'text-rose-400'
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-2">Calendar</h1>
        <p className="text-gray-300 mb-8">
          Your bills, debt due dates, and paychecks, automatically laid out on the month.
        </p>

        {incomeMissingDate && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>
              One or more income sources don't have a next pay date set, so they won't show up here yet.{' '}
              <Link href="/income" className="underline hover:text-amber-100">
                Add a pay date on the Income page
              </Link>{' '}
              to include them.
            </span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading calendar...</div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
            {/* Main column: month grid + this month's agenda */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => goToMonth(-1)}
                  className="rounded-lg border border-gray-700 p-2 text-gray-300 hover:bg-[#1a233a]"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-xl font-semibold">{monthLabel}</h2>
                <button
                  onClick={() => goToMonth(1)}
                  className="rounded-lg border border-gray-700 p-2 text-gray-300 hover:bg-[#1a233a]"
                  aria-label="Next month"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-700 bg-[#0f172a]">
                <div className="grid grid-cols-7 border-b border-gray-700 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {WEEKDAY_LABELS.map((w) => (
                    <div key={w} className="py-2">
                      {w}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {cells.map((cell, idx) => {
                    if (!cell) {
                      return <div key={`empty-${idx}`} className="min-h-[84px] border-b border-r border-gray-800" />
                    }
                    const dayEvents = eventsByDay.get(cell.date) ?? []
                    const isToday = cell.date === today
                    return (
                      <div
                        key={cell.date}
                        className={`min-h-[84px] border-b border-r border-gray-800 p-1.5 ${
                          isToday ? 'bg-emerald-400/[0.06]' : ''
                        }`}
                      >
                        <div
                          className={`mb-1 text-xs ${
                            isToday
                              ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 font-bold text-slate-950'
                              : 'text-gray-500'
                          }`}
                        >
                          {cell.day}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((e, i) => (
                            <div
                              key={i}
                              className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                                e.type === 'income'
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : e.type === 'debt'
                                  ? 'bg-amber-500/15 text-amber-300'
                                  : 'bg-rose-500/15 text-rose-300'
                              }`}
                              title={`${e.name} — ${formatMoney(e.amount)}`}
                            >
                              {e.type === 'income' ? `+${formatMoney(Math.round(e.amount))}` : `-${formatMoney(Math.round(e.amount))}`}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-gray-500">+{dayEvents.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Agenda list */}
              <div className="mt-8">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  This month
                </h3>
                {events.length > 0 ? (
                  <div className="space-y-2">
                    {events.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-gray-700 bg-[#0f172a] px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          {eventIcon(e.type)}
                          <div>
                            <p className="text-sm font-medium">{e.name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                        <p className={`text-sm font-bold ${eventColor(e.type)}`}>
                          {e.type === 'income' ? `+${formatMoney(e.amount)}` : `-${formatMoney(e.amount)}`}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nothing scheduled this month yet.</p>
                )}
              </div>
            </div>

            {/* Side column: Upcoming (30 days), always visible next to the calendar */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Upcoming (30 days)
              </h3>
              {upcoming.length > 0 ? (
                <div className="space-y-2">
                  {upcoming.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0f172a] px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {eventIcon(e.type)}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-100">{e.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <p className={`shrink-0 text-sm font-bold ${eventColor(e.type)}`}>
                        {e.type === 'income' ? `+${formatMoney(e.amount)}` : `-${formatMoney(e.amount)}`}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Nothing coming up in the next 30 days. If that seems wrong, make sure your bills,
                  debts, and income have a due day / pay date set.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
