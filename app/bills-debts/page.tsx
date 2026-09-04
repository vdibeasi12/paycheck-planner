'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import {
  Plus,
  Trash2,
  Upload,
  Pencil,
  Check,
  X,
  FileSpreadsheet,
  Receipt,
  Repeat,
  CreditCard,
  Camera,
  Lock,
  AlertCircle,
  Clock,
  Download,
  FileText,
  Loader2,
  Wallet,
  CheckCircle2,
} from 'lucide-react'
import SmartCapture from '../components/SmartCapture'
import { isPremium, getMaxDebts } from '@/lib/permissions'
import { useFormatCurrency } from '@/lib/i18n/formatCurrency'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { monthlyFactor } from '@/lib/monthlyFactor'
import { findBillDebtOverlaps } from '@/lib/billDebtOverlap'
import { consumeCapturePrefill } from '@/lib/capturePrefill'
import { checkAchievementsAndCelebrate } from '@/lib/checkAchievements'
import { celebrate, popMilestone, crossedMilestone } from '@/lib/confetti'
import { DEBT_TYPES, debtTypeLabel } from '@/lib/debtTypes'
import { toISODate, daysBetween, addDays } from '@/lib/paycheckCycles'
import { billOccurrenceInMonth } from '@/lib/schedule'
import { generateBillsDebtsPdf } from '@/lib/generateBillsDebtsPdf'

// Sep 4 2026, Vince: Bills and Debts used to be two separate pages built
// around an accounting distinction (a recurring expense vs. money you
// borrowed) that most people don't actually think in. What people actually
// want to know is "what do I owe, when's it due, and which paycheck needs to
// cover it" -- and a debt not showing a due date at all (the Debts page never
// had a Due Day field, even though the debts table has always had the column
// -- see the new "Due Day" input below) was the sharpest symptom of that.
// This page merges both into one obligations list with Type/Due/Status,
// keeping Bill vs Debt as a per-row attribute rather than a nav split. The
// underlying `bills`/`debts` tables are untouched -- this is a view layer,
// not a schema migration, so Safe to Spend/Paycheck Shield/achievements/CSV
// import/Plaid sync (all of which read those tables directly) don't change.
// The Snowball/Avalanche payoff-plan preview that used to live inline here
// stays on its own destination (Payoff Plan, /amortization) per the same
// "what do I owe" vs. "how do I eliminate it faster" split.
//
// QA fix (Sep 4 2026, Vince): reflowed into a single top-to-bottom column
// instead of a form-beside-list grid -- Recurring costs now sits above Add
// Bill or Debt, and the full schedule (attention summary + tabs + list)
// sits below it, matching how people actually read the page. Dropped the
// "Review subscriptions / Show all bills" toggle: it did filter correctly,
// but nothing about it looked different from the tab bar and its own active
// state didn't visibly update, so it read as broken -- the Subscription
// badge already on each row plus the Bills tab cover the same need without
// a second, confusing control. Added CSV/PDF export of whatever the tabs
// are currently showing, so "what do I actually have" can leave the app.

interface Bill {
  id: string
  name: string
  amount: number
  due_date: number
  category: string | null
  frequency?: string | null
  // QA fix (Sep 4 2026, Vince): a bimonthly bill (every 2 months) has no
  // anchor date to say WHICH of the two months it lands on -- only a
  // day-of-month. Without this, lib/paycheckCycles.ts's itemsDueInWindow had
  // no choice but to treat it as due every single month, which is what
  // silently inflated a live "Still Due Before Payday" figure. 'odd' = Jan,
  // Mar, May, Jul, Sep, Nov; 'even' = Feb, Apr, Jun, Aug, Oct, Dec. Only
  // meaningful when frequency is 'bimonthly'.
  bimonthly_parity?: 'odd' | 'even' | null
  // QA fix (Sep 4 2026, Vince): "I paid the mortgage today from 53rd, this
  // should change my amount" -- no live bank feed (no Plaid Auth), so the
  // only way the app finds out a bill/debt actually got paid is if the user
  // says so. paid_through is the nominal due date (day-of-month resolved to
  // an actual date) of the most recent occurrence confirmed via "Mark as
  // paid" below -- see lib/paycheckCycles.ts's itemsDueInWindow for how this
  // keeps that occurrence from being subtracted again later.
  paid_through: string | null
  created_at: string
}

type CashAccountOption = { id: string; kind: 'checking' | 'savings'; name: string; balance: number }

interface Debt {
  id: string
  name: string
  balance: number
  original_balance: number | null
  interest_rate: number
  minimum_payment: number
  due_date: number | null
  debt_type: string | null
  escrow_payment: number | null
  covered_by_transfer: boolean
  // QA fix (Sep 4 2026, Vince): "my mortgage's due date is the 1st but I have
  // a grace period till the 16th without a penalty." Distinct from
  // covered_by_transfer (money that leaves automatically -- excluded from
  // Safe to Spend entirely): a debt with a grace period still gets paid from
  // this account, just not necessarily the instant the nominal due day hits.
  // Shifts the effective due date used everywhere (Safe to Spend, Paycheck
  // Shield, and the Overdue/Grace status below) to due_date + this many days.
  grace_period_days: number | null
  // See Bill.paid_through above -- same mechanism, same field, for debts.
  paid_through: string | null
  created_at: string
}

type ObligationType = 'bill' | 'debt'
type UrgencyStatus = 'overdue' | 'due-soon' | 'upcoming' | 'no-date' | 'grace'
type Tab = 'all' | 'bills' | 'debts' | 'due-soon' | 'overdue'

type Obligation = {
  id: string
  type: ObligationType
  name: string
  amount: number // bills: the bill amount; debts: the minimum payment
  due_date: number | null
  occurrenceDate: string | null
  daysUntil: number | null
  status: UrgencyStatus
  badge: string | null // bill category, or debt type label
  isSubscription: boolean
  raw: Bill | Debt
}

const SUBSCRIPTION_CATEGORY = 'Subscriptions'

// QA fix (Sep 4 2026, Vince): graceDays (debts only -- bills always pass 0)
// shifts the *effective* due date used for status purposes to
// dueDay + graceDays, so a debt within a real grace period (mortgage due the
// 1st, no penalty till the 16th) shows as "Grace period" instead of
// "Overdue" the moment the nominal day passes, and doesn't count as due (for
// Safe to Spend/Paycheck Shield) until the grace window actually ends. Once
// the grace window itself passes, it's genuinely overdue.
function statusOf(
  dueDay: number | null,
  todayISO: string,
  graceDays: number = 0
): { occurrenceDate: string | null; daysUntil: number | null; status: UrgencyStatus } {
  if (!dueDay) return { occurrenceDate: null, daysUntil: null, status: 'no-date' }
  const today = new Date(todayISO + 'T00:00:00')
  const occurrenceDate = billOccurrenceInMonth(dueDay, today.getFullYear(), today.getMonth())
  const effectiveDate = graceDays > 0 ? toISODate(addDays(new Date(occurrenceDate + 'T00:00:00'), graceDays)) : occurrenceDate
  const daysUntil = daysBetween(todayISO, effectiveDate)
  const inGrace = graceDays > 0 && todayISO > occurrenceDate && todayISO <= effectiveDate
  const status: UrgencyStatus = daysUntil < 0 ? 'overdue' : inGrace ? 'grace' : daysUntil <= 7 ? 'due-soon' : 'upcoming'
  return { occurrenceDate, daysUntil, status }
}

// Shared with CSV/PDF export so the plain-text status always matches what
// the StatusPill shows on screen.
function statusLabel(status: UrgencyStatus, daysUntil: number | null): string {
  if (status === 'no-date') return 'No due date'
  if (status === 'overdue') return 'Overdue'
  if (status === 'grace') return 'Grace period'
  if (status === 'due-soon') return daysUntil === 0 ? 'Due today' : `Due in ${daysUntil}d`
  return 'Upcoming'
}

function StatusPill({ status, daysUntil }: { status: UrgencyStatus; daysUntil: number | null }) {
  if (status === 'no-date') {
    return (
      <span className="rounded-full bg-gray-700/50 px-2 py-0.5 text-[11px] font-medium text-gray-400">
        No due date
      </span>
    )
  }
  if (status === 'overdue') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-300">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Overdue
      </span>
    )
  }
  if (status === 'due-soon') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        {daysUntil === 0 ? 'Due today' : `Due in ${daysUntil}d`}
      </span>
    )
  }
  if (status === 'grace') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-300">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> Grace period
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Upcoming
    </span>
  )
}

export default function BillsAndDebtsPage() {
  const formatMoney = useFormatCurrency()
  const { currency, locale } = useLocale()
  const router = useRouter()

  const [bills, setBills] = useState<Bill[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState('free')
  const [isAdmin, setIsAdmin] = useState(false)

  const [tab, setTab] = useState<Tab>('all')
  const [exportingPdf, setExportingPdf] = useState(false)

  // Add form -- one panel, a Bill/Debt toggle switches which fields show.
  const [formType, setFormType] = useState<ObligationType>('bill')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('') // bill amount
  const [dueDay, setDueDay] = useState('')
  const [frequency, setFrequency] = useState<'monthly' | 'bimonthly'>('monthly')
  const [bimonthlyParity, setBimonthlyParity] = useState<'odd' | 'even'>('odd')
  const [isSubscription, setIsSubscription] = useState(false)
  const [balance, setBalance] = useState('')
  const [rate, setRate] = useState('')
  const [minPayment, setMinPayment] = useState('')
  const [debtType, setDebtType] = useState('')
  const [escrowPayment, setEscrowPayment] = useState('')
  const [coveredByTransfer, setCoveredByTransfer] = useState(false)
  const [gracePeriodDays, setGracePeriodDays] = useState('')
  const [showCapture, setShowCapture] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editType, setEditType] = useState<ObligationType>('bill')
  const [editName, setEditName] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editDueDay, setEditDueDay] = useState('')
  const [editFrequency, setEditFrequency] = useState<'monthly' | 'bimonthly'>('monthly')
  const [editBimonthlyParity, setEditBimonthlyParity] = useState<'odd' | 'even'>('odd')
  const [editIsSubscription, setEditIsSubscription] = useState(false)
  const [editOriginalCategory, setEditOriginalCategory] = useState<string | null>(null)
  const [editBalance, setEditBalance] = useState('')
  const [editRate, setEditRate] = useState('')
  const [editMinPayment, setEditMinPayment] = useState('')
  const [editDebtType, setEditDebtType] = useState('')
  const [editEscrowPayment, setEditEscrowPayment] = useState('')
  const [editCoveredByTransfer, setEditCoveredByTransfer] = useState(false)
  const [editGracePeriodDays, setEditGracePeriodDays] = useState('')

  // "Mark as paid" (Sep 4 2026, Vince) -- see Bill.paid_through above. Lets
  // the user say "I paid this" right now instead of waiting for the due
  // date, which both settles this cycle's occurrence (so it isn't
  // subtracted again later) and immediately debits the account they paid it
  // from, so that balance stops sitting "static" between manual updates.
  const [cashAccounts, setCashAccounts] = useState<CashAccountOption[]>([])
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payAccountId, setPayAccountId] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payBusy, setPayBusy] = useState(false)

  const todayISO = toISODate(new Date())

  async function loadAll() {
    try {
      const [{ data: billsData }, { data: debtsData }, { data: cashData }, { data: auth }] = await Promise.all([
        supabase.from('bills').select('*'),
        supabase
          .from('debts')
          .select(
            'id, name, balance, original_balance, interest_rate, minimum_payment, due_date, debt_type, escrow_payment, covered_by_transfer, grace_period_days, paid_through, created_at'
          ),
        supabase.from('cash_accounts').select('id, kind, name, balance').order('kind').order('name'),
        supabase.auth.getUser(),
      ])
      if (billsData) setBills(billsData)
      if (debtsData) setDebts(debtsData as Debt[])
      if (cashData) setCashAccounts(cashData as CashAccountOption[])
      if (auth.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan, is_admin')
          .eq('id', auth.user.id)
          .maybeSingle()
        if (profile) {
          setPlan((profile.plan as string) || 'free')
          setIsAdmin(!!profile.is_admin)
        }
      }
    } catch (error) {
      console.error('Error loading bills/debts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Picks up a scan that started with the wrong type selected (e.g. a credit
  // card statement scanned while "Bill" was toggled) -- SmartCapture detects
  // the mismatch and sends the user here with the correctly-extracted fields
  // via lib/capturePrefill.ts, same handoff both old pages used.
  useEffect(() => {
    const billPrefill = consumeCapturePrefill('bill')
    if (billPrefill) {
      setFormType('bill')
      if (billPrefill.name) setName(billPrefill.name)
      if (billPrefill.amount != null) setAmount(String(billPrefill.amount))
      if (billPrefill.dueDate) {
        const parsed = new Date(billPrefill.dueDate + 'T00:00:00Z')
        if (!isNaN(parsed.getTime())) setDueDay(String(parsed.getUTCDate()))
      }
      return
    }
    const debtPrefill = consumeCapturePrefill('debt')
    if (debtPrefill) {
      setFormType('debt')
      if (debtPrefill.name) setName(debtPrefill.name)
      if (debtPrefill.balance != null) setBalance(String(debtPrefill.balance))
      if (debtPrefill.interest_rate != null) setRate(String(debtPrefill.interest_rate))
      if (debtPrefill.minimum_payment != null) setMinPayment(String(debtPrefill.minimum_payment))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const obligations: Obligation[] = useMemo(() => {
    const billItems: Obligation[] = bills.map((b) => {
      const s = statusOf(b.due_date, todayISO)
      return {
        id: b.id,
        type: 'bill',
        name: b.name,
        amount: Number(b.amount) || 0,
        due_date: b.due_date,
        occurrenceDate: s.occurrenceDate,
        daysUntil: s.daysUntil,
        status: s.status,
        badge: b.category && b.category !== SUBSCRIPTION_CATEGORY ? b.category : null,
        isSubscription: b.category === SUBSCRIPTION_CATEGORY,
        raw: b,
      }
    })
    const debtItems: Obligation[] = debts.map((d) => {
      const s = statusOf(d.due_date, todayISO, d.grace_period_days || 0)
      return {
        id: d.id,
        type: 'debt',
        name: d.name,
        amount: Number(d.minimum_payment) || 0,
        due_date: d.due_date,
        occurrenceDate: s.occurrenceDate,
        daysUntil: s.daysUntil,
        status: s.status,
        badge: d.debt_type ? debtTypeLabel(d.debt_type) : null,
        isSubscription: false,
        raw: d,
      }
    })
    return [...billItems, ...debtItems].sort((a, b) => {
      if (a.due_date == null && b.due_date == null) return 0
      if (a.due_date == null) return 1
      if (b.due_date == null) return -1
      return (a.daysUntil ?? 999) - (b.daysUntil ?? 999)
    })
  }, [bills, debts, todayISO])

  const overlaps = useMemo(() => findBillDebtOverlaps(bills, debts), [bills, debts])

  const subscriptionBills = useMemo(() => obligations.filter((o) => o.isSubscription), [obligations])
  const combinedMonthlyTotal = useMemo(
    () =>
      bills.reduce((sum, b) => sum + Number(b.amount) * monthlyFactor(b.frequency), 0) +
      debts.reduce((sum, d) => sum + (Number(d.minimum_payment) || 0), 0),
    [bills, debts]
  )

  // "What needs your attention" -- shown independent of whichever tab is
  // selected below. Overdue first (most urgent), then due-soon, then a
  // capped preview of what's coming up after that.
  const attentionItems = useMemo(
    () => obligations.filter((o) => o.status === 'overdue' || o.status === 'due-soon' || o.status === 'grace'),
    [obligations]
  )
  const comingUpItems = useMemo(
    () => obligations.filter((o) => o.status === 'upcoming').slice(0, 5),
    [obligations]
  )

  const tabbed = useMemo(() => {
    switch (tab) {
      case 'bills':
        return obligations.filter((o) => o.type === 'bill')
      case 'debts':
        return obligations.filter((o) => o.type === 'debt')
      case 'due-soon':
        return obligations.filter((o) => o.status === 'due-soon')
      case 'overdue':
        return obligations.filter((o) => o.status === 'overdue')
      default:
        return obligations
    }
  }, [obligations, tab])

  const tabTotal = tabbed.reduce((sum, o) => sum + o.amount, 0)

  const maxDebts = isAdmin ? Infinity : getMaxDebts(plan)
  const unlimitedDebts = !isFinite(maxDebts) || maxDebts >= 999999
  const atDebtLimit = !unlimitedDebts && debts.length >= maxDebts

  function resetForm() {
    setName('')
    setAmount('')
    setDueDay('')
    setFrequency('monthly')
    setBimonthlyParity('odd')
    setIsSubscription(false)
    setBalance('')
    setRate('')
    setMinPayment('')
    setDebtType('')
    setEscrowPayment('')
    setCoveredByTransfer(false)
    setGracePeriodDays('')
  }

  async function addObligation(e: React.FormEvent) {
    e.preventDefault()
    const { data: userAuth } = await supabase.auth.getUser()
    if (!userAuth.user) {
      alert('You must be logged in to add this')
      return
    }

    if (formType === 'bill') {
      if (!name || !amount || !dueDay) {
        alert('Please fill in the name, amount, and due day')
        return
      }
      // A mortgage/auto/student loan tracked as a Debt has its own payoff
      // plan -- adding it here too double-counts that payment anywhere
      // bills and debt payments get summed together (e.g. Safe-to-Spend).
      const overlap = findBillDebtOverlaps([{ name }], debts)[0]
      if (overlap) {
        const proceed = window.confirm(
          `"${overlap.debt.name}" is already tracked as a debt with its own payoff plan. ` +
            `If this is that same loan/mortgage payment, add it as a Debt instead so it isn't counted twice.\n\n` +
            `Click OK only if this is a genuinely different bill.`
        )
        if (!proceed) return
      }
      try {
        const { error } = await supabase.from('bills').insert({
          user_id: userAuth.user.id,
          name,
          amount: Number(amount),
          due_date: Number(dueDay),
          frequency,
          bimonthly_parity: frequency === 'bimonthly' ? bimonthlyParity : null,
          category: isSubscription ? SUBSCRIPTION_CATEGORY : null,
        })
        if (error) throw error
        resetForm()
        loadAll()
        checkAchievementsAndCelebrate()
      } catch (error) {
        console.error('Error adding bill:', error)
        alert('Failed to add bill')
      }
    } else {
      if (!name || !balance) {
        alert('Please enter at least a name and balance')
        return
      }
      const limit = isAdmin ? Infinity : getMaxDebts(plan)
      if (debts.length >= limit) {
        alert('You have reached your plan limit of ' + limit + ' debts. Upgrade your plan to track more.')
        return
      }
      try {
        const { error } = await supabase.from('debts').insert({
          user_id: userAuth.user.id,
          name,
          balance: Number(balance),
          original_balance: Number(balance),
          interest_rate: rate === '' ? 0 : Number(rate),
          minimum_payment: minPayment === '' ? 0 : Number(minPayment),
          due_date: dueDay === '' ? null : Number(dueDay),
          debt_type: debtType || null,
          escrow_payment: escrowPayment === '' ? null : Number(escrowPayment),
          covered_by_transfer: coveredByTransfer,
          grace_period_days: gracePeriodDays === '' ? 0 : Number(gracePeriodDays),
        })
        if (error) throw error
        resetForm()
        loadAll()
        checkAchievementsAndCelebrate()
      } catch (error) {
        console.error('Error adding debt:', error)
        alert('Failed to add debt')
      }
    }
  }

  function handleExtractedBill(fields: { name: string | null; amount: number | null; dueDate: string | null }) {
    if (fields.name) setName(fields.name)
    if (fields.amount != null) setAmount(String(fields.amount))
    if (fields.dueDate) {
      const parsed = new Date(fields.dueDate + 'T00:00:00Z')
      if (!isNaN(parsed.getTime())) setDueDay(String(parsed.getUTCDate()))
    }
    setShowCapture(false)
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

  function startEdit(o: Obligation) {
    setEditingId(o.id)
    setEditType(o.type)
    if (o.type === 'bill') {
      const b = o.raw as Bill
      setEditName(b.name ?? '')
      setEditAmount(String(b.amount ?? ''))
      setEditDueDay(String(b.due_date ?? ''))
      setEditFrequency(b.frequency === 'bimonthly' ? 'bimonthly' : 'monthly')
      setEditBimonthlyParity(b.bimonthly_parity === 'even' ? 'even' : 'odd')
      setEditIsSubscription(b.category === SUBSCRIPTION_CATEGORY)
      setEditOriginalCategory(b.category ?? null)
    } else {
      const d = o.raw as Debt
      setEditName(d.name ?? '')
      setEditBalance(String(d.balance ?? ''))
      setEditRate(String(d.interest_rate ?? ''))
      setEditMinPayment(String(d.minimum_payment ?? ''))
      setEditDueDay(d.due_date != null ? String(d.due_date) : '')
      setEditDebtType(d.debt_type ?? '')
      setEditEscrowPayment(d.escrow_payment != null ? String(d.escrow_payment) : '')
      setEditCoveredByTransfer(!!d.covered_by_transfer)
      setEditGracePeriodDays(d.grace_period_days ? String(d.grace_period_days) : '')
    }
  }

  async function saveEdit(o: Obligation) {
    if (o.type === 'bill') {
      if (!editName || !editAmount || !editDueDay) {
        alert('Please fill in all fields')
        return
      }
      try {
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
            bimonthly_parity: editFrequency === 'bimonthly' ? editBimonthlyParity : null,
            category,
          })
          .eq('id', o.id)
        if (error) throw error
        setEditingId(null)
        loadAll()
      } catch (error) {
        console.error('Error updating bill:', error)
        alert('Failed to save changes')
      }
    } else {
      try {
        const newBalance = Number(editBalance) || 0
        const existing = debts.find((d) => d.id === o.id)
        const prevBalance = existing ? Number(existing.balance) : null
        const original = existing?.original_balance != null ? Number(existing.original_balance) : null

        const { error } = await supabase
          .from('debts')
          .update({
            name: editName,
            balance: newBalance,
            interest_rate: editRate === '' ? 0 : Number(editRate),
            minimum_payment: editMinPayment === '' ? 0 : Number(editMinPayment),
            due_date: editDueDay === '' ? null : Number(editDueDay),
            debt_type: editDebtType || null,
            escrow_payment: editEscrowPayment === '' ? null : Number(editEscrowPayment),
            covered_by_transfer: editCoveredByTransfer,
            grace_period_days: editGracePeriodDays === '' ? 0 : Number(editGracePeriodDays),
          })
          .eq('id', o.id)
        if (error) throw error
        setEditingId(null)
        loadAll()

        if (prevBalance != null && prevBalance > 0 && newBalance <= 0) {
          celebrate()
          checkAchievementsAndCelebrate()
        } else if (original && original > 0 && prevBalance != null) {
          const before = Math.min(100, Math.max(0, ((original - prevBalance) / original) * 100))
          const after = Math.min(100, Math.max(0, ((original - newBalance) / original) * 100))
          if (crossedMilestone(before, after)) popMilestone()
        }
      } catch (error) {
        console.error('Error updating debt:', error)
        alert('Failed to save changes')
      }
    }
  }

  async function deleteObligation(o: Obligation) {
    if (o.type === 'debt' && !window.confirm('Delete this debt?')) return
    try {
      const { error } = await supabase.from(o.type === 'bill' ? 'bills' : 'debts').delete().eq('id', o.id)
      if (error) throw error
      loadAll()
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Failed to delete')
    }
  }

  // The nominal (no-grace) occurrence date for this obligation's current
  // monthly cycle -- what "Mark as paid" records into paid_through, and what
  // decides whether it's already settled. Deliberately the raw due day, not
  // the grace-adjusted one: paying early inside a grace window still
  // settles that cycle (see lib/paycheckCycles.ts's itemsDueInWindow).
  function currentNominalOccurrence(dueDay: number): string {
    const today = new Date(todayISO + 'T00:00:00')
    return billOccurrenceInMonth(dueDay, today.getFullYear(), today.getMonth())
  }

  function isPaidThisCycle(o: Obligation): boolean {
    if (!o.due_date) return false
    const paidThrough = o.type === 'bill' ? (o.raw as Bill).paid_through : (o.raw as Debt).paid_through
    if (!paidThrough) return false
    return paidThrough >= currentNominalOccurrence(o.due_date)
  }

  function startPay(o: Obligation) {
    setPayingId(o.id)
    setPayAmount(String(o.amount))
    const defaultAccount = cashAccounts.find((a) => a.kind === 'checking') ?? cashAccounts[0]
    setPayAccountId(defaultAccount?.id ?? '')
  }

  function cancelPay() {
    setPayingId(null)
    setPayAccountId('')
    setPayAmount('')
  }

  // Confirms a real-world payment: settles this obligation's current cycle
  // (paid_through) so it isn't subtracted again once its due date rolls
  // around, and debits the chosen account right now instead of leaving that
  // balance "static" until the next manual edit -- the whole point being
  // this is a stand-in for a live bank balance (no Plaid Auth), so it has to
  // move when real money moves.
  async function confirmPay(o: Obligation) {
    if (!o.due_date) return
    const amountNum = Number(payAmount)
    if (!payAccountId) {
      alert('Choose which account this came out of')
      return
    }
    if (!(amountNum > 0)) {
      alert('Enter the amount actually paid')
      return
    }
    const account = cashAccounts.find((a) => a.id === payAccountId)
    if (!account) {
      alert('That account could not be found -- try reloading the page')
      return
    }
    setPayBusy(true)
    try {
      const nominalDate = currentNominalOccurrence(o.due_date)
      const newBalance = Math.round((Number(account.balance) - amountNum) * 100) / 100
      const [{ error: obligationError }, { error: accountError }] = await Promise.all([
        supabase.from(o.type === 'bill' ? 'bills' : 'debts').update({ paid_through: nominalDate }).eq('id', o.id),
        supabase.from('cash_accounts').update({ balance: newBalance, balance_as_of: todayISO }).eq('id', payAccountId),
      ])
      if (obligationError) throw obligationError
      if (accountError) throw accountError
      cancelPay()
      loadAll()
    } catch (error) {
      console.error('Error marking paid:', error)
      alert('Failed to record this payment')
    } finally {
      setPayBusy(false)
    }
  }

  function exportCsv() {
    const header = ['Item', 'Type', 'Amount', 'Due', 'Status']
    const esc = (v: string) => {
      if (v.indexOf(',') >= 0 || v.indexOf('"') >= 0 || v.indexOf('\n') >= 0) {
        return '"' + v.replace(/"/g, '""') + '"'
      }
      return v
    }
    const lines = [
      header.join(','),
      ...tabbed.map((o) =>
        [
          esc(o.name),
          o.type === 'bill' ? 'Bill' : 'Debt',
          String(o.amount),
          o.due_date ? `Day ${o.due_date}` : '',
          statusLabel(o.status, o.daysUntil),
        ].join(',')
      ),
    ]
    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bills-and-debts.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function exportPdf() {
    setExportingPdf(true)
    try {
      await generateBillsDebtsPdf(
        tabbed.map((o) => ({
          name: o.name,
          type: o.type,
          amount: o.amount,
          due_date: o.due_date,
          status: statusLabel(o.status, o.daysUntil),
        })),
        currency,
        locale
      )
    } finally {
      setExportingPdf(false)
    }
  }

  const inputClass = 'w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500'

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'bills', label: 'Bills' },
    { key: 'debts', label: 'Debts' },
    { key: 'due-soon', label: 'Due Soon' },
    { key: 'overdue', label: 'Overdue' },
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-2">Bills &amp; Debts</h1>
        <p className="text-gray-300 mb-6">Everything you owe, organized by due date and paycheck.</p>

        {overlaps.length > 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="space-y-1">
              <p className="font-medium text-amber-100">
                {overlaps.length === 1
                  ? 'A bill and a debt look like the same payment'
                  : `${overlaps.length} bills and debts look like the same payment`}
              </p>
              <p>
                If two rows below represent the same real payment (e.g. a mortgage entered as both a Bill and a
                Debt), it&apos;s being counted twice anywhere bills and debt payments get summed together.
              </p>
            </div>
          </div>
        )}

        {!loading && subscriptionBills.length > 0 && (
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Repeat className="text-green-400 shrink-0" size={22} />
            <div>
              <p className="font-semibold">Recurring costs detected</p>
              <p className="text-gray-400 text-sm">
                {subscriptionBills.length} subscription{subscriptionBills.length === 1 ? '' : 's'} tagged below
                &middot; potential monthly cost {formatMoney(combinedMonthlyTotal)}
              </p>
            </div>
          </div>
        )}

        {/* Add form -- full width now that it isn't sharing a grid row with
            the schedule below it. */}
        <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Add Bill or Debt</h2>

          <div className="mb-5 inline-flex w-full max-w-sm rounded-lg border border-gray-700 bg-[#1a233a] p-1">
            <button
              type="button"
              onClick={() => setFormType('bill')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition ${
                formType === 'bill' ? 'bg-green-500 text-black' : 'text-gray-300 hover:text-white'
              }`}
            >
              <Receipt size={15} /> Bill
            </button>
            <button
              type="button"
              onClick={() => setFormType('debt')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition ${
                formType === 'debt' ? 'bg-green-500 text-black' : 'text-gray-300 hover:text-white'
              }`}
            >
              <CreditCard size={15} /> Debt
            </button>
          </div>
          <p className="mb-4 text-xs text-gray-500">
            {formType === 'bill'
              ? 'A recurring expense with no balance to pay off -- rent, utilities, insurance, subscriptions.'
              : 'Money you borrowed and still owe -- credit card, auto loan, student loan, mortgage.'}
          </p>

          <form onSubmit={addObligation} className="mb-6 pb-6 border-b border-gray-700">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-gray-400 text-sm block mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={formType === 'bill' ? 'e.g., Electric Bill' : 'e.g., Visa card'}
                  className={inputClass}
                />
              </div>

              {formType === 'bill' ? (
                <>
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className={inputClass}
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
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">How Often</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as 'monthly' | 'bimonthly')}
                      className={inputClass}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="bimonthly">Every 2 months (Bi-Monthly)</option>
                    </select>
                  </div>
                  {frequency === 'bimonthly' && (
                    <div>
                      <label className="text-gray-400 text-sm block mb-2">Which months?</label>
                      <select
                        value={bimonthlyParity}
                        onChange={(e) => setBimonthlyParity(e.target.value as 'odd' | 'even')}
                        className={inputClass}
                      >
                        <option value="odd">Jan, Mar, May, Jul, Sep, Nov</option>
                        <option value="even">Feb, Apr, Jun, Aug, Oct, Dec</option>
                      </select>
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={isSubscription}
                      onChange={(e) => setIsSubscription(e.target.checked)}
                      className="rounded border-gray-700 bg-[#1a233a] text-green-500 focus:ring-green-500"
                    />
                    This is a subscription (Netflix, Spotify, etc.)
                  </label>
                </>
              ) : (
                <>
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
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">
                      Due Day (1-31){' '}
                      <span className="normal-case text-gray-500">-- which paycheck should cover this</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                      placeholder="14"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">Debt type</label>
                    <select value={debtType} onChange={(e) => setDebtType(e.target.value)} className={inputClass}>
                      {DEBT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    {debtType === 'mortgage' && (
                      <p className="mt-1.5 text-xs text-gray-500">
                        Mortgages keep their own minimum payment but won&apos;t automatically get extra/freed-up
                        payments in your Payoff Plan unless you turn that on there.
                      </p>
                    )}
                  </div>
                  {debtType === 'mortgage' && (
                    <div>
                      <label className="text-gray-400 text-sm block mb-2">Escrow included above ($/mo, optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={escrowPayment}
                        onChange={(e) => setEscrowPayment(e.target.value)}
                        placeholder="e.g., 450.00"
                        className={inputClass}
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">
                      Grace period (days, optional){' '}
                      <span className="normal-case text-gray-500">-- days past the due day before it's really late</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={gracePeriodDays}
                      onChange={(e) => setGracePeriodDays(e.target.value)}
                      placeholder="e.g., 15"
                      className={inputClass}
                    />
                  </div>
                  <label className="flex items-start gap-2 text-sm text-gray-400 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={coveredByTransfer}
                      onChange={(e) => setCoveredByTransfer(e.target.checked)}
                      className="mt-0.5 shrink-0"
                    />
                    <span>
                      Paid automatically from a linked transfer -- excludes it from Safe to Spend/Survival Mode so
                      it&apos;s not subtracted twice. Don&apos;t check this just because you pay it within a grace
                      window yourself -- use Grace period above for that instead.
                    </span>
                  </label>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={formType === 'debt' && atDebtLimit}
              className="w-full max-w-sm mt-4 bg-green-500 hover:bg-green-600 text-black font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-500"
            >
              <Plus size={20} /> Add {formType === 'bill' ? 'Bill' : 'Debt'}
            </button>

            {formType === 'debt' && atDebtLimit && (
              <div className="mt-4 max-w-sm rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
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
          </form>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {showCapture ? (
              <div className="sm:col-span-2">
                <SmartCapture
                  docType={formType}
                  onExtracted={(formType === 'bill' ? handleExtractedBill : handleExtractedDebt) as any}
                />
              </div>
            ) : (
              <button
                onClick={() => {
                  if (formType === 'bill' && !isPremium(plan)) {
                    router.push('/pricing')
                    return
                  }
                  setShowCapture(true)
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Camera size={20} /> Scan a {formType === 'bill' ? 'bill' : 'statement'} photo
              </button>
            )}

            <button
              onClick={() => router.push('/import')}
              className="border border-gray-700 text-gray-200 hover:bg-[#1a233a] font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
            >
              <FileSpreadsheet size={20} /> Import bank statement
            </button>
          </div>

          <p className="text-gray-500 text-xs mt-4">
            {unlimitedDebts
              ? debts.length + ' debts tracked - unlimited on your plan'
              : debts.length + ' of ' + maxDebts + ' debts used on your plan'}
          </p>

          <Link
            href="/amortization"
            className="mt-4 block rounded-lg border border-gray-700 px-3 py-2.5 text-center text-sm font-semibold text-emerald-400 hover:bg-[#1a233a]"
          >
            View your payoff plan &rarr;
          </Link>
        </div>

        {/* The schedule -- what needs attention, then the full itemized,
            filterable list. Sits below Add Bill or Debt now. */}
        {!loading && attentionItems.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-700 bg-[#0f172a] p-5">
            <div className="mb-3 flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Next 7 days</h2>
            </div>
            <div className="space-y-2">
              {attentionItems.map((o) => (
                <div key={o.type + o.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${o.status === 'overdue' ? 'bg-red-400' : 'bg-amber-400'}`} />
                    <span className="truncate text-sm font-medium text-white">{o.name}</span>
                    <span className="shrink-0 rounded-full bg-[#1a233a] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                      {o.type}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold text-gray-200">{formatMoney(o.amount)}</span>
                    <StatusPill status={o.status} daysUntil={o.daysUntil} />
                  </div>
                </div>
              ))}
            </div>

            {comingUpItems.length > 0 && (
              <>
                <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Coming up</p>
                <div className="space-y-1.5">
                  {comingUpItems.map((o) => (
                    <div key={o.type + o.id} className="flex items-center justify-between px-3 py-1 text-sm">
                      <span className="text-gray-400">
                        {o.occurrenceDate
                          ? new Date(o.occurrenceDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : ''}{' '}
                        &middot; {o.name}
                      </span>
                      <span className="text-gray-300">{formatMoney(o.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-gray-700 pb-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const count =
                t.key === 'all'
                  ? obligations.length
                  : t.key === 'bills'
                    ? obligations.filter((o) => o.type === 'bill').length
                    : t.key === 'debts'
                      ? obligations.filter((o) => o.type === 'debt').length
                      : t.key === 'due-soon'
                        ? obligations.filter((o) => o.status === 'due-soon').length
                        : obligations.filter((o) => o.status === 'overdue').length
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    tab === t.key
                      ? 'bg-green-500 text-black'
                      : 'bg-[#0f172a] border border-gray-700 text-gray-300 hover:bg-[#1a233a]'
                  }`}
                >
                  {t.label}
                  {count > 0 && <span className="text-xs opacity-70">{count}</span>}
                </button>
              )
            })}
          </div>

          {tabbed.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={exportCsv}
                className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-[#0f172a] px-3 py-1.5 text-sm font-semibold text-gray-300 hover:bg-[#1a233a]"
              >
                <Download size={14} /> CSV
              </button>
              <button
                onClick={exportPdf}
                disabled={exportingPdf}
                className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-[#0f172a] px-3 py-1.5 text-sm font-semibold text-gray-300 hover:bg-[#1a233a] disabled:opacity-60"
              >
                {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} PDF
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total (this view)</p>
            <p className="text-3xl font-bold text-green-400">{formatMoney(tabTotal)}</p>
          </div>
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Number of items</p>
            <p className="text-3xl font-bold text-blue-400">{tabbed.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : tabbed.length > 0 ? (
          <div className="space-y-3">
            {tabbed.map((o) => (
              <div key={o.type + o.id} className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                {editingId === o.id ? (
                  <div className="space-y-3">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Name"
                      className={inputClass}
                    />
                    {editType === 'bill' ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-gray-500 text-xs block mb-1">Amount ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className={inputClass}
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
                              className={inputClass}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-gray-500 text-xs block mb-1">How often</label>
                          <select
                            value={editFrequency}
                            onChange={(e) => setEditFrequency(e.target.value as 'monthly' | 'bimonthly')}
                            className={inputClass}
                          >
                            <option value="monthly">Monthly</option>
                            <option value="bimonthly">Every 2 months (Bi-Monthly)</option>
                          </select>
                        </div>
                        {editFrequency === 'bimonthly' && (
                          <div>
                            <label className="text-gray-500 text-xs block mb-1">Which months?</label>
                            <select
                              value={editBimonthlyParity}
                              onChange={(e) => setEditBimonthlyParity(e.target.value as 'odd' | 'even')}
                              className={inputClass}
                            >
                              <option value="odd">Jan, Mar, May, Jul, Sep, Nov</option>
                              <option value="even">Feb, Apr, Jun, Aug, Oct, Dec</option>
                            </select>
                          </div>
                        )}
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editIsSubscription}
                            onChange={(e) => setEditIsSubscription(e.target.checked)}
                            className="rounded border-gray-700 bg-[#1a233a] text-green-500 focus:ring-green-500"
                          />
                          This is a subscription
                        </label>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-gray-500 text-xs block mb-1">Balance</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editBalance}
                              onChange={(e) => setEditBalance(e.target.value)}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="text-gray-500 text-xs block mb-1">APR %</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editRate}
                              onChange={(e) => setEditRate(e.target.value)}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="text-gray-500 text-xs block mb-1">Min</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editMinPayment}
                              onChange={(e) => setEditMinPayment(e.target.value)}
                              className={inputClass}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-gray-500 text-xs block mb-1">Due day (1-31)</label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={editDueDay}
                            onChange={(e) => setEditDueDay(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 text-xs block mb-1">Debt type</label>
                          <select
                            value={editDebtType}
                            onChange={(e) => setEditDebtType(e.target.value)}
                            className={inputClass}
                          >
                            {DEBT_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {editDebtType === 'mortgage' && (
                          <div>
                            <label className="text-gray-500 text-xs block mb-1">
                              Escrow included above ($/mo, optional)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={editEscrowPayment}
                              onChange={(e) => setEditEscrowPayment(e.target.value)}
                              placeholder="e.g., 450.00"
                              className={inputClass}
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-gray-500 text-xs block mb-1">Grace period (days, optional)</label>
                          <input
                            type="number"
                            min="0"
                            max="60"
                            value={editGracePeriodDays}
                            onChange={(e) => setEditGracePeriodDays(e.target.value)}
                            placeholder="e.g., 15"
                            className={inputClass}
                          />
                        </div>
                        <label className="flex items-start gap-2 text-xs text-gray-400">
                          <input
                            type="checkbox"
                            checked={editCoveredByTransfer}
                            onChange={(e) => setEditCoveredByTransfer(e.target.checked)}
                            className="mt-0.5 shrink-0"
                          />
                          <span>Paid automatically from a linked transfer (excludes it from Safe to Spend)</span>
                        </label>
                      </>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(o)}
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
                ) : payingId === o.id ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-300">
                      Mark <span className="font-semibold text-white">{o.name}</span> as paid -- this settles it for
                      this cycle and debits the account below right now.
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label className="text-gray-500 text-xs block mb-1">Amount paid ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs block mb-1">Paid from</label>
                        <select value={payAccountId} onChange={(e) => setPayAccountId(e.target.value)} className={inputClass}>
                          {cashAccounts.length === 0 && <option value="">No accounts on file</option>}
                          {cashAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({formatMoney(Number(a.balance))})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmPay(o)}
                        disabled={payBusy}
                        className="flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-semibold text-black hover:bg-green-600 disabled:opacity-50"
                      >
                        <Check size={16} /> {payBusy ? 'Saving...' : 'Confirm paid'}
                      </button>
                      <button
                        onClick={cancelPay}
                        className="flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-[#1a233a]"
                      >
                        <X size={16} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg flex flex-wrap items-center gap-2">
                        {o.type === 'bill' ? (
                          <Receipt size={16} className="text-emerald-400 shrink-0" />
                        ) : (
                          <CreditCard size={16} className="text-rose-400 shrink-0" />
                        )}
                        {o.name}
                        <span className="rounded-full bg-[#1a233a] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          {o.type}
                        </span>
                        {o.badge && (
                          <span className="rounded-full bg-[#1a233a] px-2 py-0.5 text-xs font-medium text-gray-400">
                            {o.badge}
                          </span>
                        )}
                        {o.isSubscription && (
                          <span className="rounded-full bg-[#1a233a] px-2 py-0.5 text-xs font-medium text-gray-400">
                            Subscription
                          </span>
                        )}
                        {o.type === 'debt' && (o.raw as Debt).covered_by_transfer && (
                          <span
                            className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-300"
                            title="Excluded from Safe to Spend/Survival Mode -- paid automatically from a linked transfer instead."
                          >
                            paid via transfer
                          </span>
                        )}
                        <StatusPill status={o.status} daysUntil={o.daysUntil} />
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {o.due_date
                          ? `${o.type === 'bill' && o.isSubscription ? 'Renews' : 'Due'} on day ${o.due_date}${
                              o.type === 'bill' && (o.raw as Bill).frequency === 'bimonthly'
                                ? (o.raw as Bill).bimonthly_parity === 'even'
                                  ? ' (Feb, Apr, Jun, Aug, Oct, Dec)'
                                  : (o.raw as Bill).bimonthly_parity === 'odd'
                                    ? ' (Jan, Mar, May, Jul, Sep, Nov)'
                                    : ' every 2 months -- edit to set which months so it isn\'t counted every month'
                                : ' of each month'
                            }`
                          : 'No due day set -- edit to add one so this counts toward a specific paycheck.'}
                        {o.type === 'debt' && Number((o.raw as Debt).interest_rate) > 0
                          ? ` · ${Number((o.raw as Debt).interest_rate).toFixed(2)}% APR`
                          : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <p className={`text-2xl font-bold ${o.type === 'bill' ? 'text-green-400' : 'text-rose-400'}`}>
                        {formatMoney(o.type === 'debt' ? Number((o.raw as Debt).balance) : o.amount)}
                      </p>
                      {o.due_date &&
                        (isPaidThisCycle(o) ? (
                          <span
                            className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300"
                            title="Settled for this cycle -- won't be subtracted from Safe to Spend again until next month's due date."
                          >
                            <CheckCircle2 size={14} /> Paid
                          </span>
                        ) : (
                          <button
                            onClick={() => startPay(o)}
                            className="text-gray-400 hover:text-emerald-400 transition p-2"
                            aria-label="Mark as paid"
                            title="Mark as paid -- settles this cycle and debits the account you paid it from"
                          >
                            <Wallet size={18} />
                          </button>
                        ))}
                      <button onClick={() => startEdit(o)} className="text-gray-400 hover:text-white transition p-2" aria-label="Edit">
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => deleteObligation(o)}
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
            <p>Nothing here yet</p>
            <p className="text-sm mt-2">Add a bill or debt to see it show up here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
