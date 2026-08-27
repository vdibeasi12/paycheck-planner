"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Download, FileText, Loader2, CalendarClock, TrendingDown, AlertTriangle, ListChecks, ChevronDown } from "lucide-react"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import { useLocale } from "@/lib/i18n/LocaleProvider"
import { generatePayoffPlanPdf } from "@/lib/generatePayoffPlanPdf"
import type { Debt, Strategy, DebtRow, Sim, AvalancheCriterion } from "@/lib/payoffSimulate"
import { simulate, monthLabel, strategiesTie, strategyOrder, MORTGAGE_DEBT_TYPE } from "@/lib/payoffSimulate"
import { debtTypeLabel } from "@/lib/debtTypes"

type Props = {
  debts: Debt[]
}

function toCsv(rows: DebtRow[]): string {
  const header = [
    "Month",
    "Date",
    "Debt",
    "Starting Balance",
    "Payment",
    "Interest",
    "Principal",
    "Ending Balance",
  ]
  const esc = (v: string) => {
    if (v.indexOf(",") >= 0 || v.indexOf('"') >= 0 || v.indexOf("\n") >= 0) {
      return '"' + v.replace(/"/g, '""') + '"'
    }
    return v
  }
  const lines = [header.join(",")]
  for (const r of rows) {
    lines.push(
      [
        String(r.month),
        esc(r.label),
        esc(r.debtName),
        r.startBalance.toFixed(2),
        r.payment.toFixed(2),
        r.interest.toFixed(2),
        r.principal.toFixed(2),
        r.endBalance.toFixed(2),
      ].join(",")
    )
  }
  return lines.join("\n")
}

export default function AmortizationSchedule({ debts }: Props) {
  const formatMoney = useFormatCurrency()
  const { currency, locale } = useLocale()
  const [pdfBusy, setPdfBusy] = useState(false)
  const fmt = formatMoney
  const fmt0 = (n: number) => formatMoney(Math.round(n))
  const [strategy, setStrategy] = useState<Strategy>("snowball")
  const [avalancheCriterion, setAvalancheCriterion] = useState<AvalancheCriterion>("balance")
  const [extra, setExtra] = useState<number>(0)
  const [extraText, setExtraText] = useState<string>("0")
  // QA fix (Aug 15 2026): mortgages are excluded from the extra-payment
  // redirect by default (see lib/payoffSimulate.ts) -- this is the opt-in.
  const [includeMortgageInExtra, setIncludeMortgageInExtra] = useState(false)

  // Which debts actually feed the plan below. Defaults to everything, so
  // nothing changes for anyone who never touches this -- but a mortgage or
  // car loan that's going to take years can be unchecked so the plan (and
  // its "debt-free" date/interest total) reflects, say, just the credit
  // cards someone is actually trying to focus on right now.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(debts.map((d) => d.id))
  )
  const selectedDebts = useMemo(
    () => debts.filter((d) => selectedIds.has(d.id)),
    [debts, selectedIds]
  )
  const toggleDebt = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const selectAllDebts = () => setSelectedIds(new Set(debts.map((d) => d.id)))

  // QA fix (Aug 27 2026): the old "Credit cards only" / "Exclude mortgage &
  // auto" presets were two fixed, overlapping shortcuts -- for anyone whose
  // non-mortgage/non-auto debts happen to ALL be credit cards (Vince's own
  // account), the two buttons necessarily produced the identical selection,
  // which read as a bug ("they do the same thing") rather than the expected
  // outcome. Replaced with one "Filter by type" dropdown driven directly by
  // whatever debt types actually exist on the account -- explicit, doesn't
  // silently coincide with itself, and covers types the old presets never
  // did (student loan, personal loan, etc). Individual per-debt checkboxes
  // below still give full manual control on top of this.
  const typeGroups = useMemo(() => {
    const map = new Map<string, { label: string; ids: string[] }>()
    for (const d of debts) {
      const key = (d.debt_type || "").toLowerCase()
      if (!map.has(key)) map.set(key, { label: debtTypeLabel(d.debt_type), ids: [] })
      map.get(key)!.ids.push(d.id)
    }
    return Array.from(map.values())
  }, [debts])
  const isGroupSelected = (ids: string[]) => ids.every((id) => selectedIds.has(id))
  const toggleGroup = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allIn = ids.every((id) => next.has(id))
      ids.forEach((id) => (allIn ? next.delete(id) : next.add(id)))
      return next
    })
  }
  const [typeMenuOpen, setTypeMenuOpen] = useState(false)
  const typeMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!typeMenuOpen) return
    const onClick = (e: MouseEvent) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) setTypeMenuOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [typeMenuOpen])

  // Debts with no minimum payment on file -- almost always means we don't
  // have real data for that debt yet (freshly bank-synced accounts can land
  // with balance but no reported minimum payment/APR until a statement
  // posts), not that the minimum genuinely is $0. Surfaced both as a badge
  // in the checklist below and folded into the non-amortizing message so
  // it's obvious *why* a plan can't be built instead of just showing blanks.
  const noMinPaymentIds = useMemo(
    () => new Set(debts.filter((d) => Math.max(0, Number(d.minimum_payment) || 0) <= 0).map((d) => d.id)),
    [debts]
  )

  const hasMortgage = useMemo(
    () => selectedDebts.some((d) => (d.debt_type || "").toLowerCase() === MORTGAGE_DEBT_TYPE),
    [selectedDebts]
  )

  // Always-computable numbers for the debts currently in the plan -- these
  // don't depend on the month-by-month simulation succeeding, so they can
  // still show real figures (instead of blank dashes) even when the combined
  // minimum payments can't amortize the balances yet.
  const selectedMinTotal = useMemo(
    () =>
      selectedDebts.reduce((sum, d) => {
        const min = Math.max(0, Number(d.minimum_payment) || 0)
        const escrow = Math.max(0, Number(d.escrow_payment) || 0)
        return sum + Math.max(0, min - escrow)
      }, 0),
    [selectedDebts]
  )
  const selectedInterestMonthly = useMemo(
    () =>
      selectedDebts.reduce((sum, d) => {
        const rate = Math.max(0, Number(d.interest_rate) || 0) / 100 / 12
        return sum + Math.max(0, Number(d.balance) || 0) * rate
      }, 0),
    [selectedDebts]
  )
  const selectedMissingMinCount = useMemo(
    () => selectedDebts.filter((d) => noMinPaymentIds.has(d.id)).length,
    [selectedDebts, noMinPaymentIds]
  )

  const start = useMemo(() => new Date(), [])
  const sim = useMemo(
    () => simulate(selectedDebts, strategy, extra, start, avalancheCriterion, includeMortgageInExtra),
    [selectedDebts, strategy, extra, start, avalancheCriterion, includeMortgageInExtra]
  )
  const tied = useMemo(
    () => strategiesTie(selectedDebts, avalancheCriterion),
    [selectedDebts, avalancheCriterion]
  )
  const orderedDebts = useMemo(
    () => strategyOrder(selectedDebts, strategy, avalancheCriterion),
    [selectedDebts, strategy, avalancheCriterion]
  )

  const download = () => {
    const csv = toCsv(sim.debtRows)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "amortization-" + strategy + ".csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadPdf = async () => {
    setPdfBusy(true)
    try {
      const payoffOrder = orderedDebts
        .map((d, idx) => {
          const info = sim.perDebt.find((p) => p.id === d.id)
          if (!info) return null
          return {
            rank: idx + 1,
            name: d.name,
            payoffLabel: info.payoffLabel,
            totalInterest: info.totalInterest,
          }
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)
      await generatePayoffPlanPdf({
        strategy,
        avalancheCriterion,
        extra,
        currency,
        locale,
        debtFreeLabel,
        durationText,
        totalInterest: sim.totalInterest,
        totalPaid: sim.totalPaid,
        payoffOrder,
        monthlyRows: sim.monthlyRows,
      })
    } finally {
      setPdfBusy(false)
    }
  }

  const years = Math.floor(sim.months / 12)
  const remMonths = sim.months % 12
  const durationText =
    sim.months === 0
      ? "-"
      : (
          (years > 0 ? years + (years === 1 ? " yr " : " yrs ") : "") +
          (remMonths > 0 ? remMonths + (remMonths === 1 ? " mo" : " mos") : "")
        ).trim()

  const debtFreeLabel = sim.months > 0 ? monthLabel(start, sim.months - 1) : "-"

  return (
    <div className="space-y-6">
      {/* Debt selection -- which debts this plan actually accounts for. */}
      <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListChecks size={16} className="text-emerald-400" />
            <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400">
              Debts in this plan
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectAllDebts}
              className={
                "rounded-md border px-2.5 py-1 text-xs font-medium transition " +
                (selectedIds.size === debts.length
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                  : "border-gray-700 text-gray-300 hover:bg-[#1a233a]")
              }
            >
              All debts
            </button>
            <div className="relative" ref={typeMenuRef}>
              <button
                type="button"
                onClick={() => setTypeMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-md border border-gray-700 px-2.5 py-1 text-xs font-medium text-gray-300 transition hover:bg-[#1a233a]"
              >
                Filter by type
                <ChevronDown size={12} className={typeMenuOpen ? "rotate-180 transition" : "transition"} />
              </button>
              {typeMenuOpen && (
                <div className="absolute right-0 z-20 mt-1 w-60 rounded-lg border border-gray-700 bg-[#0f172a] p-2 shadow-xl">
                  {typeGroups.map((g) => (
                    <label
                      key={g.label}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-200 hover:bg-[#1a233a]"
                    >
                      <input
                        type="checkbox"
                        checked={isGroupSelected(g.ids)}
                        onChange={() => toggleGroup(g.ids)}
                      />
                      <span className="flex-1">{g.label}</span>
                      <span className="text-xs text-gray-500">{g.ids.length}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {debts.map((d) => (
            <label
              key={d.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-800 bg-[#0b1220] px-3 py-2"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(d.id)}
                onChange={() => toggleDebt(d.id)}
                className="shrink-0"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-gray-200">{d.name}</span>
              <span className="shrink-0 rounded-full bg-[#1a233a] px-2 py-0.5 text-[11px] font-medium text-gray-400">
                {debtTypeLabel(d.debt_type)}
              </span>
              {noMinPaymentIds.has(d.id) && (
                <span
                  className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300"
                  title="No minimum payment on file for this debt yet -- edit it on the Debts page to add one."
                >
                  no min. payment on file
                </span>
              )}
              <span className="shrink-0 text-sm text-gray-400">{fmt(d.balance)}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {selectedDebts.length} of {debts.length} debt{debts.length === 1 ? "" : "s"} included in this
          plan{selectedDebts.length !== debts.length ? " -- everything else keeps its own minimum payment, untouched by this plan." : ""}
        </p>
      </div>

      {selectedDebts.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <span>Select at least one debt above to see a payoff plan.</span>
        </div>
      )}

      {selectedDebts.length > 0 && (
        <>
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
            Strategy
          </label>
          <div className="inline-flex rounded-lg border border-gray-700 bg-[#0f172a] p-1">
            <button
              onClick={() => setStrategy("snowball")}
              className={
                "rounded-md px-3 py-1.5 text-sm transition " +
                (strategy === "snowball"
                  ? "bg-green-500 font-medium text-black"
                  : "text-gray-300 hover:text-white")
              }
            >
              Snowball
            </button>
            <button
              onClick={() => setStrategy("avalanche")}
              className={
                "rounded-md px-3 py-1.5 text-sm transition " +
                (strategy === "avalanche"
                  ? "bg-green-500 font-medium text-black"
                  : "text-gray-300 hover:text-white")
              }
            >
              Avalanche
            </button>
          </div>
          {strategy === "avalanche" && (
            <div className="mt-2 inline-flex rounded-md border border-blue-900/60 bg-[#0f172a] p-0.5">
              <button
                onClick={() => setAvalancheCriterion("balance")}
                className={
                  "rounded px-2 py-1 text-xs transition " +
                  (avalancheCriterion === "balance"
                    ? "bg-blue-500 font-medium text-black"
                    : "text-gray-400 hover:text-white")
                }
              >
                Biggest balance
              </button>
              <button
                onClick={() => setAvalancheCriterion("rate")}
                className={
                  "rounded px-2 py-1 text-xs transition " +
                  (avalancheCriterion === "rate"
                    ? "bg-blue-500 font-medium text-black"
                    : "text-gray-400 hover:text-white")
                }
              >
                Highest rate
              </button>
            </div>
          )}
          {tied && (
            <p className="mt-1.5 max-w-xs text-xs text-gray-500">
              {avalancheCriterion === "balance"
                ? "Both strategies give the same result for your current debts -- with only one active debt (or balances that all match), smallest-balance-first and biggest-balance-first land on the same order."
                : "Both strategies give the same result for your current debts -- your highest-rate debt is also your smallest balance, so Snowball and Avalanche pick the same payoff order."}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
            Extra monthly payment
          </label>
          <div className="flex items-center rounded-lg border border-gray-700 bg-[#0f172a] px-3">
            <span className="text-gray-400">$</span>
            <input
              type="number"
              min={0}
              step={25}
              value={extraText}
              onFocus={() => {
                if (extraText === "0") setExtraText("")
              }}
              onBlur={() => {
                if (extraText.trim() === "") setExtraText("0")
              }}
              onChange={(e) => {
                const raw = e.target.value
                setExtraText(raw)
                setExtra(Math.max(0, Number(raw) || 0))
              }}
              className="w-28 bg-transparent px-2 py-2 text-white outline-none placeholder:text-gray-500"
              placeholder="0"
            />
          </div>
        </div>

        {hasMortgage && (
          <div className="max-w-xs">
            <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={includeMortgageInExtra}
                onChange={(e) => setIncludeMortgageInExtra(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Apply extra/freed-up payments to my mortgage too
                <span className="mt-0.5 block text-xs text-gray-500">
                  Off by default -- your mortgage still gets its own minimum payment either way,
                  it just won&apos;t get extra money redirected to it once your other debts are
                  paid off unless you turn this on.
                </span>
              </span>
            </label>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={download}
            disabled={sim.debtRows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-transparent px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-[#1a233a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={16} />
            CSV
          </button>
          <button
            onClick={downloadPdf}
            disabled={sim.debtRows.length === 0 || pdfBusy}
            className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pdfBusy ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {pdfBusy ? "Generating..." : "PDF"}
          </button>
        </div>
      </div>

      {sim.nonAmortizing && (
        <>
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
            {selectedMinTotal + extra <= 0 ? (
              <span>
                {selectedMissingMinCount === selectedDebts.length
                  ? "None of the debts in this plan have a minimum payment on file yet"
                  : selectedMissingMinCount + " of " + selectedDebts.length + " debts in this plan have no minimum payment on file yet"}
                {" "}(common right after connecting a credit card, before your first statement posts) -- there's nothing to
                simulate with a $0 budget. Add an extra monthly payment above, or{" "}
                <a href="/debts" className="font-medium underline hover:text-amber-100">
                  edit these debts
                </a>{" "}
                to add their real minimum payments.
              </span>
            ) : (
              <span>
                At the current payments, your total monthly payment does not cover the interest that
                accrues, so the balances never fall. Add an extra monthly payment to see a payoff
                schedule.
              </span>
            )}
          </div>

          {/* Fallback numbers -- even when a full schedule can't be built,
              these two are always knowable and answer "what am I actually
              paying / accruing right now" instead of leaving the page blank. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-5">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-xs font-medium uppercase tracking-wide">Minimum payments</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{fmt0(selectedMinTotal)}</p>
              <p className="text-sm text-gray-400">per month, across the debts in this plan</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-5">
              <div className="flex items-center gap-2 text-gray-400">
                <TrendingDown size={16} className="text-amber-400" />
                <span className="text-xs font-medium uppercase tracking-wide">Interest accruing</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-300">{fmt0(selectedInterestMonthly)}</p>
              <p className="text-sm text-gray-400">per month, at today's balances</p>
            </div>
          </div>
        </>
      )}

      {sim.capped && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <span>
            Payoff takes longer than 50 years at this payment. Add an extra monthly payment to
            shorten it.
          </span>
        </div>
      )}

      {!sim.nonAmortizing && sim.months > 0 && (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-5">
              <div className="flex items-center gap-2 text-gray-400">
                <CalendarClock size={16} className="text-emerald-400" />
                <span className="text-xs font-medium uppercase tracking-wide">Debt-free</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-400">{debtFreeLabel}</p>
              <p className="text-sm text-gray-400">{durationText}</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-5">
              <div className="flex items-center gap-2 text-gray-400">
                <TrendingDown size={16} className="text-emerald-400" />
                <span className="text-xs font-medium uppercase tracking-wide">Total interest</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{fmt0(sim.totalInterest)}</p>
              <p className="text-sm text-gray-400">paid over the plan</p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-5">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-xs font-medium uppercase tracking-wide">Total paid</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{fmt0(sim.totalPaid)}</p>
              <p className="text-sm text-gray-400">principal plus interest</p>
            </div>
          </div>

          {/* Per-debt payoff order. QA fix (Aug 15 2026): "debt-free in N
              years" used to show with nothing backing it up per debt -- now
              each row also shows the balance/APR/minimum that number came
              from, and flags when a mortgage isn't receiving extra payments
              so it's clear why its payoff date reflects its own minimum-
              payment pace rather than the strategy above. */}
          <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-5">
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-400">
              Payoff order
            </h3>
            <div className="space-y-3">
              {orderedDebts.map((d, idx) => {
                const info = sim.perDebt.find((p) => p.id === d.id)
                if (!info) return null
                const excludedFromExtra = info.isMortgage && !includeMortgageInExtra
                return (
                  <div
                    key={d.id}
                    className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-800 pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <span className="flex items-center gap-2 text-white">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-400">
                          {idx + 1}
                        </span>
                        {d.name}
                        {excludedFromExtra && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                            minimum payment only
                          </span>
                        )}
                      </span>
                      <p className="mt-1 text-xs text-gray-500">
                        {fmt(d.balance)} balance - {Number(d.interest_rate).toFixed(2)}% APR -{" "}
                        {fmt(d.minimum_payment)}/mo minimum
                        {Number(d.escrow_payment) > 0
                          ? ` (${fmt(Number(d.escrow_payment))} escrow, ${fmt(
                              Number(d.minimum_payment) - Number(d.escrow_payment)
                            )} applied to the loan)`
                          : ""}
                      </p>
                    </div>
                    <span className="text-sm text-gray-400">
                      paid off {info.payoffLabel} - {fmt(info.totalInterest)} interest
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Monthly schedule */}
          <div className="rounded-2xl border border-gray-700 bg-[#0f172a]">
            <div className="border-b border-gray-800 px-5 py-3">
              <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400">
                Monthly schedule (combined -- {strategy === "snowball" ? "Snowball" : "Avalanche"})
              </h3>
            </div>
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#0b1220] text-gray-400">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-medium">#</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 text-right font-medium">Start</th>
                    <th className="px-4 py-2 text-right font-medium">Payment</th>
                    <th className="px-4 py-2 text-right font-medium">Interest</th>
                    <th className="px-4 py-2 text-right font-medium">Principal</th>
                    <th className="px-4 py-2 text-right font-medium">End</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.monthlyRows.map((r) => (
                    <tr key={r.month} className="border-t border-gray-800 text-gray-200">
                      <td className="px-4 py-2 text-gray-500">{r.month}</td>
                      <td className="px-4 py-2">{r.label}</td>
                      <td className="px-4 py-2 text-right">{fmt(r.startBalance)}</td>
                      <td className="px-4 py-2 text-right">{fmt(r.payment)}</td>
                      <td className="px-4 py-2 text-right text-amber-300">{fmt(r.interest)}</td>
                      <td className="px-4 py-2 text-right text-emerald-300">{fmt(r.principal)}</td>
                      <td className="px-4 py-2 text-right">{fmt(r.endBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
        </>
      )}
    </div>
  )
}
