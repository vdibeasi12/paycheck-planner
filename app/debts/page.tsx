'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { Plus, Trash2, CreditCard, Pencil, Check, X, Lock, Camera } from 'lucide-react'
import { getMaxDebts } from '@/lib/permissions'
import SmartCapture from '../components/SmartCapture'
import { useFormatCurrency } from '@/lib/i18n/formatCurrency'
import {
  simulate,
  strategiesTie,
  strategyOrder,
  type Strategy,
  type AvalancheCriterion,
} from '@/lib/payoffSimulate'
import { DEBT_TYPES } from '@/lib/debtTypes'
import BillsVsDebtsHint from '../components/BillsVsDebtsHint'
import { consumeCapturePrefill } from '@/lib/capturePrefill'
import { checkAchievementsAndCelebrate } from '@/lib/checkAchievements'
import { celebrate, popMilestone, crossedMilestone } from '@/lib/confetti'

interface Debt {
  id: string
  name: string
  balance: number
  original_balance: number | null
  interest_rate: number
  minimum_payment: number
  debt_type: string | null
  escrow_payment: number | null
  created_at: string
}

type EditState = {
  name: string
  balance: string
  interest_rate: string
  minimum_payment: string
  debt_type: string
  escrow_payment: string
}

const EMPTY_EDIT: EditState = {
  name: '',
  balance: '',
  interest_rate: '',
  minimum_payment: '',
  debt_type: '',
  escrow_payment: '',
}

export default function DebtsPage() {
  const formatMoney = useFormatCurrency()
  const [items, setItems] = useState<Debt[]>([])
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [rate, setRate] = useState('')
  const [minPayment, setMinPayment] = useState('')
  const [debtType, setDebtType] = useState('')
  const [escrowPayment, setEscrowPayment] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState>(EMPTY_EDIT)
  const [plan, setPlan] = useState<string>('free')
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [showCapture, setShowCapture] = useState(false)
  const [strategy, setStrategy] = useState<Strategy>('snowball')
  const [avalancheCriterion, setAvalancheCriterion] = useState<AvalancheCriterion>('balance')
  const [extraText, setExtraText] = useState('0')
  const extra = Math.max(0, Number(extraText) || 0)
  // Which debts count toward the quick payoff-plan preview below. Tracked as
  // an "excluded" set (rather than "included") so a debt loaded or added
  // later is included by default without needing to sync a second piece of
  // state -- nothing in this set means everything counts, same as before
  // this existed. A mortgage or car loan that's years away can be unchecked
  // here so the preview reflects just the debts someone's actually focused
  // on right now (e.g. credit cards). The full debt list below is always
  // shown regardless of this -- it only affects the plan preview.
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())
  const toggleIncluded = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const includeAllDebts = () => setExcludedIds(new Set())
  const includeCreditCardsOnly = () =>
    setExcludedIds(
      new Set(items.filter((d) => (d.debt_type || '').toLowerCase() !== 'credit_card').map((d) => d.id))
    )
  const excludeLongTermDebts = () =>
    setExcludedIds(
      new Set(
        items
          .filter((d) => ['mortgage', 'auto'].includes((d.debt_type || '').toLowerCase()))
          .map((d) => d.id)
      )
    )

  // Debts actually counted in the plan preview + top stat tiles below.
  // QA fix (Aug 27 2026): the "Total Balance / Min per month / Avg APR"
  // tiles used to always sum every debt regardless of this selection, so
  // picking "Credit cards only" changed the plan preview underneath but left
  // the tiles above it showing the full portfolio's numbers -- confusing
  // since they're right next to each other (Vince, Aug 27 2026).
  const includedItems = useMemo(
    () => items.filter((d) => !excludedIds.has(d.id)),
    [items, excludedIds]
  )

  // Which quick-filter preset (if any) matches the current selection, so the
  // buttons can show which one is active -- previously none of them ever
  // looked pressed, which read as the buttons being stuck even when the
  // selection was changing correctly underneath.
  const setsEqual = (a: Set<string>, b: Set<string>) =>
    a.size === b.size && [...a].every((id) => b.has(id))
  const nonCreditCardIdSet = useMemo(
    () => new Set(items.filter((d) => (d.debt_type || '').toLowerCase() !== 'credit_card').map((d) => d.id)),
    [items]
  )
  const longTermIdSet = useMemo(
    () =>
      new Set(
        items
          .filter((d) => ['mortgage', 'auto'].includes((d.debt_type || '').toLowerCase()))
          .map((d) => d.id)
      ),
    [items]
  )
  const activePreset: 'all' | 'creditCards' | 'excludeLongTerm' | 'custom' = useMemo(() => {
    if (excludedIds.size === 0) return 'all'
    if (setsEqual(excludedIds, nonCreditCardIdSet)) return 'creditCards'
    if (setsEqual(excludedIds, longTermIdSet)) return 'excludeLongTerm'
    return 'custom'
  }, [excludedIds, nonCreditCardIdSet, longTermIdSet])

  const presetButtonClass = (preset: 'all' | 'creditCards' | 'excludeLongTerm') =>
    'rounded-md border px-2.5 py-1 text-xs font-medium transition ' +
    (activePreset === preset
      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
      : 'border-gray-700 text-gray-300 hover:bg-[#1a233a]')

  // Debts with no minimum payment on file -- almost always a data gap (e.g.
  // a freshly bank-synced card before its first statement posts) rather
  // than a genuine $0 minimum. Flagged on each row and folded into the
  // preview widget's messaging so it's clear why a plan can't be built,
  // instead of just showing dashes.
  const noMinPaymentIds = useMemo(
    () => new Set(items.filter((d) => Math.max(0, Number(d.minimum_payment) || 0) <= 0).map((d) => d.id)),
    [items]
  )

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
        .select('id, name, balance, original_balance, interest_rate, minimum_payment, debt_type, escrow_payment, created_at')
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
        debt_type: debtType || null,
        escrow_payment: escrowPayment === '' ? null : Number(escrowPayment),
      })
      if (error) throw error
      setName('')
      setBalance('')
      setRate('')
      setMinPayment('')
      setDebtType('')
      setEscrowPayment('')
      loadDebts()
      // First debt added earns "debt_tracker" -- check right now instead of
      // waiting for a later dashboard visit.
      checkAchievementsAndCelebrate()
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

  // Picks up a scan that started on a different page (e.g. someone scanned
  // a credit card statement from the Bills page) -- SmartCapture there
  // detected it was really a Debt and sent the user here with the fields
  // already extracted, via lib/capturePrefill.ts, rather than making them
  // re-enter everything or re-scan.
  useEffect(() => {
    const prefill = consumeCapturePrefill('debt')
    if (prefill) handleExtractedDebt(prefill)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startEdit(d: Debt) {
    setEditingId(d.id)
    setEdit({
      name: d.name ?? '',
      balance: String(d.balance ?? ''),
      interest_rate: String(d.interest_rate ?? ''),
      minimum_payment: String(d.minimum_payment ?? ''),
      debt_type: d.debt_type ?? '',
      escrow_payment: d.escrow_payment != null ? String(d.escrow_payment) : '',
    })
  }

  async function saveEdit(id: string) {
    try {
      const newBalance = Number(edit.balance) || 0
      // Captured before the update so we can tell whether this save just
      // paid the debt off or crossed a 25/50/75% checkpoint -- same
      // before/after comparison GoalTracker.tsx already does for savings
      // goals (see lib/confetti.ts's crossedMilestone), applied here for the
      // first time. Every payoff/checkpoint fires, not just the first one
      // ever (unlike the "debt_slayer" badge, which is a one-time award) --
      // paying off your third credit card should feel just as good as your
      // first.
      const existing = items.find((d) => d.id === id)
      const prevBalance = existing ? Number(existing.balance) : null
      const original = existing?.original_balance != null ? Number(existing.original_balance) : null

      const { error } = await supabase
        .from('debts')
        .update({
          name: edit.name,
          balance: newBalance,
          interest_rate: edit.interest_rate === '' ? 0 : Number(edit.interest_rate),
          minimum_payment: edit.minimum_payment === '' ? 0 : Number(edit.minimum_payment),
          debt_type: edit.debt_type || null,
          escrow_payment: edit.escrow_payment === '' ? null : Number(edit.escrow_payment),
        })
        .eq('id', id)
      if (error) throw error
      setEditingId(null)
      loadDebts()

      if (prevBalance != null && prevBalance > 0 && newBalance <= 0) {
        // Paid off entirely -- the big moment, every time it happens.
        celebrate()
        // Also re-check badges in the background for "debt_free" (every
        // tracked debt now cleared), which is a separate, bigger milestone
        // than any single payoff.
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

  const totalBalance = includedItems.reduce((sum, d) => sum + (Number(d.balance) || 0), 0)
  const totalMin = includedItems.reduce((sum, d) => sum + (Number(d.minimum_payment) || 0), 0)
  const avgApr =
    totalBalance > 0
      ? includedItems.reduce((sum, d) => sum + (Number(d.balance) || 0) * (Number(d.interest_rate) || 0), 0) /
        totalBalance
      : 0

  // The list below is ordered by the selected payoff strategy, not just
  // insertion order -- Snowball shows smallest balance first, Avalanche
  // shows highest interest rate first. This is the actual "tackle this one
  // first" order the strategy implies, separate from the aggregate totals
  // shown in the widget above (which can tie even when this list doesn't,
  // or vice versa, depending on the debt set).
  const sortedItems = useMemo(
    () => strategyOrder(items, strategy, avalancheCriterion),
    [items, strategy, avalancheCriterion]
  )

  const inputClass =
    'w-full bg-[#1a233a] border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500'

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-2">Debts</h1>
        <p className="text-gray-300 mb-4">
          Add and update your debts. Enter the APR as a percent (e.g. 19.99) so your payoff plan is accurate.
        </p>

        <BillsVsDebtsHint page="debts" />

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
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Debt type</label>
                  <select
                    value={debtType}
                    onChange={(e) => setDebtType(e.target.value)}
                    className={inputClass}
                  >
                    {DEBT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {debtType === 'mortgage' && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      Mortgages keep their own minimum payment but won&apos;t automatically get
                      extra/freed-up payments in your Payoff Plan unless you turn that on there.
                    </p>
                  )}
                </div>
                {debtType === 'mortgage' && (
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">
                      Escrow included above ($/mo, optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={escrowPayment}
                      onChange={(e) => setEscrowPayment(e.target.value)}
                      placeholder="e.g., 450.00"
                      className={inputClass}
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      If your minimum payment above bundles in property tax/insurance, enter just
                      that portion here so your Payoff Plan only counts the part that actually pays
                      down the loan. Leave blank if your minimum payment is principal &amp;
                      interest only.
                    </p>
                  </div>
                )}
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
            {excludedIds.size > 0 && (
              <p className="mb-2 text-xs text-gray-500">
                Showing totals for {includedItems.length} of {items.length} debts (filtered below) --{' '}
                <button type="button" onClick={includeAllDebts} className="font-medium text-emerald-400 hover:underline">
                  show all
                </button>
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 mb-6">
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4 min-w-0">
                <p className="text-gray-400 text-sm">Total Balance</p>
                <p className="text-2xl font-bold text-rose-400 truncate">{formatMoney(totalBalance)}</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4 min-w-0">
                <p className="text-gray-400 text-sm">Min / month</p>
                <p className="text-2xl font-bold text-blue-400 truncate">{formatMoney(totalMin)}</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4 min-w-0">
                <p className="text-gray-400 text-sm">Avg APR</p>
                <p className="text-2xl font-bold text-amber-400 truncate">{avgApr.toFixed(2)}%</p>
              </div>
            </div>

            {items.length > 0 && (() => {
              const start = new Date()
              const sim = simulate(
                includedItems.map((d) => ({
                  id: d.id,
                  name: d.name,
                  balance: Number(d.balance) || 0,
                  interest_rate: Number(d.interest_rate) || 0,
                  minimum_payment: Number(d.minimum_payment) || 0,
                  debt_type: d.debt_type,
                  escrow_payment: d.escrow_payment,
                })),
                strategy,
                extra,
                start,
                avalancheCriterion
                // includeMortgageInExtra intentionally omitted (defaults to
                // false) -- this is the quick-preview widget; the toggle to
                // opt a mortgage into extra payments lives on the full
                // Payoff Plan page (app/components/AmortizationSchedule.tsx).
              )
              const debtFreeLabel =
                includedItems.length > 0 && sim.months > 0 && !sim.nonAmortizing
                  ? new Date(start.getFullYear(), start.getMonth() + sim.months - 1, 1).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : '-'
              const tied = strategiesTie(includedItems, avalancheCriterion)
              // Always-computable fallback numbers -- shown instead of blank
              // dashes when the combined minimums can't amortize yet
              // (missing bank data is the usual cause -- see noMinPaymentIds).
              const includedMinTotal = includedItems.reduce((sum, d) => {
                const min = Math.max(0, Number(d.minimum_payment) || 0)
                const escrow = Math.max(0, Number(d.escrow_payment) || 0)
                return sum + Math.max(0, min - escrow)
              }, 0)
              const includedInterestMonthly = includedItems.reduce((sum, d) => {
                const rate = Math.max(0, Number(d.interest_rate) || 0) / 100 / 12
                return sum + Math.max(0, Number(d.balance) || 0) * rate
              }, 0)
              const includedMissingMinCount = includedItems.filter((d) => noMinPaymentIds.has(d.id)).length
              return (
                <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-gray-700 bg-[#0f172a] p-4">
                  <div className="w-full">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="block text-xs font-medium uppercase tracking-wide text-gray-400">
                        Debts in this plan
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={includeAllDebts} className={presetButtonClass('all')}>
                          All debts
                        </button>
                        <button
                          type="button"
                          onClick={includeCreditCardsOnly}
                          className={presetButtonClass('creditCards')}
                        >
                          Credit cards only
                        </button>
                        <button
                          type="button"
                          onClick={excludeLongTermDebts}
                          className={presetButtonClass('excludeLongTerm')}
                        >
                          Exclude mortgage &amp; auto
                        </button>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500">
                      {includedItems.length} of {items.length} debt{items.length === 1 ? '' : 's'} included
                      {includedItems.length !== items.length
                        ? ' -- uncheck a debt below to leave it out. Excluded debts keep their own minimum payment, they just aren’t part of this plan.'
                        : ' -- uncheck any debt below to leave it out of this plan.'}
                    </p>
                  </div>

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
                    {strategy === 'avalanche' && (
                      <div className="mt-2 inline-flex rounded-md border border-blue-900/60 bg-[#1a233a] p-0.5">
                        <button
                          type="button"
                          onClick={() => setAvalancheCriterion('balance')}
                          className={
                            'rounded px-2 py-1 text-xs transition ' +
                            (avalancheCriterion === 'balance'
                              ? 'bg-blue-500 font-medium text-black'
                              : 'text-gray-400 hover:text-white')
                          }
                        >
                          Biggest balance
                        </button>
                        <button
                          type="button"
                          onClick={() => setAvalancheCriterion('rate')}
                          className={
                            'rounded px-2 py-1 text-xs transition ' +
                            (avalancheCriterion === 'rate'
                              ? 'bg-blue-500 font-medium text-black'
                              : 'text-gray-400 hover:text-white')
                          }
                        >
                          Highest rate
                        </button>
                      </div>
                    )}
                    {tied && (
                      <p className="mt-1.5 max-w-[220px] text-xs text-gray-500">
                        {avalancheCriterion === 'balance'
                          ? 'Same result either way -- with only one active debt (or matching balances), the orders coincide.'
                          : 'Same result either way -- your highest-rate debt is also your smallest balance.'}
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

                  <div className="ml-auto flex flex-wrap gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Min payment</p>
                      <p className="text-lg font-bold text-blue-400">{formatMoney(Math.round(includedMinTotal))}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Debt-free</p>
                      <p className="text-lg font-bold text-emerald-400">{debtFreeLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        {sim.nonAmortizing ? 'Interest accruing' : 'Total interest'}
                      </p>
                      <p className="text-lg font-bold text-white">
                        {sim.nonAmortizing
                          ? formatMoney(Math.round(includedInterestMonthly)) + '/mo'
                          : formatMoney(Math.round(sim.totalInterest))}
                      </p>
                    </div>
                  </div>

                  {sim.nonAmortizing && (
                    <p className="w-full text-xs text-amber-300">
                      {includedMinTotal + extra <= 0
                        ? (includedMissingMinCount === includedItems.length
                            ? 'None of the debts in this plan have a minimum payment on file yet'
                            : includedMissingMinCount + ' of ' + includedItems.length + ' debts in this plan have no minimum payment on file yet') +
                          ' (common right after connecting a bank) -- add an extra monthly payment above, or edit these debts below to add their real minimum payments.'
                        : "At the current minimums, payments don't cover the interest that accrues, so balances won't fall -- add an extra monthly payment to see a payoff date."}
                    </p>
                  )}
                </div>
              )
            })()}

            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading debts...</div>
            ) : items.length > 0 ? (
              <div className="space-y-3">
                {sortedItems.map((d, idx) => (
                  <div
                    key={d.id}
                    className={
                      'bg-[#0f172a] border border-gray-700 rounded-lg p-4' +
                      (excludedIds.has(d.id) ? ' opacity-60' : '')
                    }
                  >
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
                        <div>
                          <label className="text-gray-500 text-xs block mb-1">Debt type</label>
                          <select
                            value={edit.debt_type}
                            onChange={(e) => setEdit({ ...edit, debt_type: e.target.value })}
                            className={inputClass}
                          >
                            {DEBT_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {edit.debt_type === 'mortgage' && (
                          <div>
                            <label className="text-gray-500 text-xs block mb-1">
                              Escrow included above ($/mo, optional)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={edit.escrow_payment}
                              onChange={(e) => setEdit({ ...edit, escrow_payment: e.target.value })}
                              placeholder="e.g., 450.00"
                              className={inputClass}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              The portion of your minimum payment that&apos;s property tax/
                              insurance, not principal &amp; interest.
                            </p>
                          </div>
                        )}
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
                            <input
                              type="checkbox"
                              checked={!excludedIds.has(d.id)}
                              onChange={() => toggleIncluded(d.id)}
                              title="Include in payoff plan preview above"
                              className="shrink-0"
                            />
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-400">
                              {idx + 1}
                            </span>
                            <CreditCard size={16} className="text-rose-400" /> {d.name}
                            {d.debt_type && (
                              <span className="rounded-full bg-[#1a233a] px-2 py-0.5 text-xs font-medium text-gray-400">
                                {DEBT_TYPES.find((t) => t.value === d.debt_type)?.label ?? d.debt_type}
                              </span>
                            )}
                            {excludedIds.has(d.id) && (
                              <span className="rounded-full bg-gray-700/60 px-2 py-0.5 text-xs font-medium text-gray-400">
                                not in plan
                              </span>
                            )}
                            {noMinPaymentIds.has(d.id) && (
                              <span
                                className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300"
                                title="No minimum payment on file yet -- edit this debt to add one."
                              >
                                no min. payment on file
                              </span>
                            )}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {Number(d.interest_rate).toFixed(2)}% APR
                            {Number(d.minimum_payment) > 0
                              ? ` - min ${formatMoney(Number(d.minimum_payment))}/mo`
                              : ''}
                            {Number(d.escrow_payment) > 0
                              ? ` (incl. ${formatMoney(Number(d.escrow_payment))} escrow)`
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