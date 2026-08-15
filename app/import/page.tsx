'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { isPremium } from '@/lib/permissions'
import { analyzeCsv, type ImportAnalysis, type RecurringGroup } from '@/lib/csvImport'
import { useFormatCurrency } from '@/lib/i18n/formatCurrency'

type Step = 'upload' | 'review' | 'done'

type ImportResult = {
  transactionsImported: number
  transactionsSkipped: number
  billsCreated: number
  billsUpdated: number
  incomeCreated: number
  incomeUpdated: number
}

export default function ImportPage() {
  const router = useRouter()
  const formatMoney = useFormatCurrency()
  const fileRef = useRef<HTMLInputElement>(null)

  const [checkingPlan, setCheckingPlan] = useState(true)
  const [allowed, setAllowed] = useState(false)

  const [step, setStep] = useState<Step>('upload')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null)
  // group key -> user's include/kind choice (defaults to unchecked -- the
  // user opts recurring items IN rather than everything auto-adding).
  const [selections, setSelections] = useState<Record<string, { include: boolean; kind: 'income' | 'bill' }>>({})
  const [result, setResult] = useState<ImportResult | null>(null)

  useEffect(() => {
    async function checkPlan() {
      try {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) {
          router.push('/login')
          return
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan, is_admin')
          .eq('id', auth.user.id)
          .maybeSingle()
        const effectivePlan = profile?.is_admin ? 'connected' : profile?.plan ?? 'free'
        setAllowed(isPremium(effectivePlan))
      } catch (err) {
        console.error('Error checking plan:', err)
      } finally {
        setCheckingPlan(false)
      }
    }
    checkPlan()
  }, [router])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    setError(null)
    setBusy(true)
    try {
      const text = await file.text()
      const parsed = analyzeCsv(text)
      if (parsed.transactions.length === 0) {
        setError(
          "Couldn't find any transactions in that file. Make sure it's a CSV export with Date, Description, and Amount columns."
        )
        return
      }
      setAnalysis(parsed)
      const initialSelections: Record<string, { include: boolean; kind: 'income' | 'bill' }> = {}
      for (const g of parsed.recurringGroups) {
        initialSelections[g.key] = { include: false, kind: g.kind }
      }
      setSelections(initialSelections)
      setStep('review')
    } catch (err) {
      console.error('CSV parse error:', err)
      setError("Couldn't read that file. Please make sure it's a plain CSV export from your bank.")
    } finally {
      setBusy(false)
    }
  }

  function toggleInclude(key: string) {
    setSelections((prev) => ({ ...prev, [key]: { ...prev[key], include: !prev[key]?.include } }))
  }

  function setKind(key: string, kind: 'income' | 'bill') {
    setSelections((prev) => ({ ...prev, [key]: { ...prev[key], kind } }))
  }

  async function handleImport() {
    if (!analysis) return
    setBusy(true)
    setError(null)
    try {
      const confirmedRecurringGroups: RecurringGroup[] = analysis.recurringGroups
        .filter((g) => selections[g.key]?.include)
        .map((g) => ({ ...g, kind: selections[g.key].kind }))

      const res = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: analysis.transactions, confirmedRecurringGroups }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Import failed. Please try again.')
        return
      }
      setResult(json as ImportResult)
      setStep('done')
    } catch (err) {
      console.error('Import error:', err)
      setError('Import failed. Please check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  function startOver() {
    setAnalysis(null)
    setSelections({})
    setResult(null)
    setError(null)
    setStep('upload')
  }

  if (checkingPlan) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-[#020617] text-white py-12">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold mb-4">Import from a bank CSV</h1>
          <p className="text-gray-300 mb-8">
            Upload a CSV export from your bank and we&apos;ll automatically fill in your transactions, bills, and
            income -- no bank connection required. This is an Accelerate feature.
          </p>
          <button
            onClick={() => router.push('/pricing')}
            className="bg-green-500 hover:bg-green-600 text-black font-semibold py-3 px-6 rounded-lg transition"
          >
            See plans
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-2">Import from a bank CSV</h1>
        <p className="text-gray-300 mb-8">
          Export your recent transactions from your bank&apos;s website as a CSV, then upload it here.
        </p>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {step === 'upload' && (
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8 text-center">
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-60"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {busy ? 'Reading file...' : 'Choose CSV file'}
            </button>
            <p className="mt-4 text-sm text-gray-500">
              Nothing leaves your browser until you review and confirm the import below.
            </p>
          </div>
        )}

        {step === 'review' && analysis && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Transactions found</p>
                <p className="text-2xl font-bold">{analysis.transactions.length}</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Recurring items detected</p>
                <p className="text-2xl font-bold">{analysis.recurringGroups.length}</p>
              </div>
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Rows skipped</p>
                <p className="text-2xl font-bold">{analysis.skippedRows}</p>
              </div>
            </div>

            {analysis.recurringGroups.length > 0 && (
              <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-1">Recurring items</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Check the ones you want added as real bills or income. Anything left unchecked still gets saved to
                  your transaction history, just not as a recurring item.
                </p>
                <div className="space-y-3">
                  {analysis.recurringGroups.map((g) => {
                    const sel = selections[g.key]
                    return (
                      <div
                        key={g.key}
                        className="flex items-center justify-between gap-4 border-b border-gray-800 pb-3 last:border-0 last:pb-0"
                      >
                        <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sel?.include ?? false}
                            onChange={() => toggleInclude(g.key)}
                            className="w-4 h-4"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{g.label}</p>
                            <p className="text-xs text-gray-500">
                              {g.category} - {g.frequency} - seen {g.occurrences}x
                            </p>
                          </div>
                        </label>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={sel?.kind ?? g.kind}
                            onChange={(e) => setKind(g.key, e.target.value as 'income' | 'bill')}
                            className="bg-[#1a233a] border border-gray-700 rounded px-2 py-1 text-sm"
                          >
                            <option value="bill">Bill</option>
                            <option value="income">Income</option>
                          </select>
                          <span className="font-bold text-green-400 w-20 text-right">{formatMoney(g.amount)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={busy}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-black font-semibold py-3 px-6 rounded-lg transition disabled:opacity-60"
              >
                {busy ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {busy ? 'Importing...' : 'Confirm & import'}
              </button>
              <button
                onClick={startOver}
                disabled={busy}
                className="py-3 px-6 rounded-lg border border-gray-700 text-gray-300 hover:bg-[#1a233a] transition"
              >
                Start over
              </button>
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="flex items-center gap-2 mb-4 text-green-400">
              <CheckCircle2 size={24} />
              <h2 className="text-2xl font-bold text-white">Import complete</h2>
            </div>
            <ul className="text-gray-300 space-y-1 mb-6">
              <li>
                {result.transactionsImported} transactions saved
                {result.transactionsSkipped > 0 ? ` (${result.transactionsSkipped} duplicates skipped)` : ''}
              </li>
              {(result.billsCreated > 0 || result.billsUpdated > 0) && (
                <li>
                  {result.billsCreated} bill{result.billsCreated === 1 ? '' : 's'} added, {result.billsUpdated}{' '}
                  updated
                </li>
              )}
              {(result.incomeCreated > 0 || result.incomeUpdated > 0) && (
                <li>
                  {result.incomeCreated} income source{result.incomeCreated === 1 ? '' : 's'} added,{' '}
                  {result.incomeUpdated} updated
                </li>
              )}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-black font-semibold py-3 px-6 rounded-lg transition"
              >
                Go to dashboard <ArrowRight size={18} />
              </button>
              <button
                onClick={startOver}
                className="py-3 px-6 rounded-lg border border-gray-700 text-gray-300 hover:bg-[#1a233a] transition"
              >
                Import another file
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
