"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { canUseReports } from "@/lib/permissions"
import { simulate } from "@/lib/payoffSimulate"
import type { Debt } from "@/lib/payoffSimulate"
import { useFormatCurrency } from "@/lib/i18n/formatCurrency"
import DownloadSummaryButton from "@/app/components/DownloadSummaryButton"
import PaywallOverlay from "@/app/components/PaywallOverlay"
import InfoHint from "@/app/components/InfoHint"
import { FileText, CalendarClock, TrendingDown, AlertTriangle } from "lucide-react"

// Illustrative extra monthly payment used only for the "potential savings"
// figure below -- not a user setting. For the real, adjustable Snowball vs
// Avalanche schedule (with its own extra-payment control), see /amortization.
const EXTRA_PREVIEW = 150

export default function ReportPage() {
  const formatMoney = useFormatCurrency()
  const [debts, setDebts] = useState<Debt[]>([])
  const [plan, setPlan] = useState("free")
  const [isAdmin, setIsAdmin] = useState(false)
  const [loggedIn, setLoggedIn] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        if (!cancelled) {
          setLoggedIn(false)
          setReady(true)
        }
        return
      }

      const [{ data: profile }, { data: debtsData }] = await Promise.all([
        supabase.from("profiles").select("plan, is_admin").eq("id", user.id).maybeSingle(),
        supabase
          .from("debts")
          .select("id, name, balance, interest_rate, minimum_payment")
          .eq("user_id", user.id),
      ])

      if (cancelled) return

      setPlan((profile?.plan as string) || "free")
      setIsAdmin(!!profile?.is_admin)
      setDebts(
        (Array.isArray(debtsData) ? debtsData : []).map((d) => ({
          id: String(d.id),
          name: String(d.name || "Debt"),
          balance: Number(d.balance) || 0,
          interest_rate: Number(d.interest_rate) || 0,
          minimum_payment: Number(d.minimum_payment) || 0,
        }))
      )
      setReady(true)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Admins act as the top (connected) tier so they can use/test every feature.
  const effectivePlan = isAdmin ? "connected" : plan
  const allowed = canUseReports(effectivePlan)

  // Same engine, same defaults (Avalanche, biggest-balance-first, no extra)
  // as the Payoff Plan page, so these numbers can never drift from it.
  const start = useMemo(() => new Date(), [])
  const baseline = useMemo(() => simulate(debts, "avalanche", 0, start, "balance"), [debts, start])
  const accelerated = useMemo(
    () => simulate(debts, "avalanche", EXTRA_PREVIEW, start, "balance"),
    [debts, start]
  )

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)
  const totalMinimum = debts.reduce((sum, d) => sum + d.minimum_payment, 0)
  const potentialSavings = Math.max(0, Math.round(baseline.totalInterest - accelerated.totalInterest))

  const years = Math.floor(baseline.months / 12)
  const remMonths = baseline.months % 12
  const durationText = (
    (years > 0 ? years + (years === 1 ? " yr " : " yrs ") : "") +
    (remMonths > 0 ? remMonths + (remMonths === 1 ? " mo" : " mos") : "")
  ).trim()
  const debtFreeLabel =
    baseline.months > 0
      ? new Date(start.getFullYear(), start.getMonth() + baseline.months - 1, 1).toLocaleDateString(
          "en-US",
          { month: "long", year: "numeric" }
        )
      : "-"

  if (!ready) {
    return <div className="p-10 text-gray-400">Loading your report...</div>
  }

  if (!loggedIn) {
    return (
      <div className="p-10 text-center text-gray-400">
        Please{" "}
        <Link href="/login" className="text-emerald-400 underline">
          log in
        </Link>{" "}
        to view your report.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div>
        <div className="flex items-center gap-2">
          <FileText size={26} className="text-emerald-400" />
          <h1 className="text-3xl font-bold">Your Financial Report</h1>
          <InfoHint
            label="About your report"
            text="A snapshot of your total debt and estimated debt-free date using the Avalanche strategy at your current minimum payments, plus a downloadable PDF summary of your debts, bills, and goals."
          />
        </div>
        <p className="mt-1 text-gray-400">
          A snapshot of where you stand and how fast you&apos;re moving toward debt-free.
        </p>
      </div>

      {!allowed ? (
        <div className="relative min-h-[260px] overflow-hidden rounded-xl border border-gray-700 bg-[#0f172a] p-6">
          <div className="pointer-events-none opacity-40">
            <p className="text-gray-300">
              See your total debt, estimated debt-free date, and download a full PDF summary of
              your debts, bills, and goals.
            </p>
          </div>
          <PaywallOverlay
            priceId="price_1TO2RmFv1EcTs6LYp5OOlvOK"
            title="Unlock your Report"
            description="Upgrade to Momentum to view your report and download PDF summaries."
          />
        </div>
      ) : debts.length === 0 ? (
        <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-8 text-center">
          <FileText size={28} className="mx-auto text-emerald-400" />
          <h2 className="mt-3 text-lg font-semibold text-white">Nothing to report yet</h2>
          <p className="mt-1 text-gray-400">
            Add your debts and we&apos;ll build your report -- estimated debt-free date, total
            interest, and a downloadable summary.
          </p>
          <Link
            href="/debts"
            className="mt-4 inline-block rounded-lg bg-green-500 px-5 py-2 font-medium text-black transition hover:bg-green-600"
          >
            Add debts
          </Link>
        </div>
      ) : (
        <>
          {baseline.nonAmortizing && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
              <span>
                At your current minimum payments, your total monthly payment doesn&apos;t cover the
                interest that accrues, so your balances won&apos;t go down. Visit your{" "}
                <Link href="/amortization" className="underline">
                  Payoff Plan
                </Link>{" "}
                to add an extra monthly payment and see a real path to debt-free.
              </span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Total debt
              </p>
              <p className="mt-2 text-2xl font-bold text-white">{formatMoney(totalDebt)}</p>
              <p className="text-sm text-gray-400">
                across {debts.length} debt{debts.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Monthly minimums
              </p>
              <p className="mt-2 text-2xl font-bold text-white">{formatMoney(totalMinimum)}</p>
              <p className="text-sm text-gray-400">total minimum payments due</p>
            </div>
          </div>

          {!baseline.nonAmortizing && baseline.months > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-5">
                <div className="flex items-center gap-2 text-gray-400">
                  <CalendarClock size={16} className="text-emerald-400" />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Estimated debt-free
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-emerald-400">{debtFreeLabel}</p>
                <p className="text-sm text-gray-400">{durationText} at minimum payments</p>
              </div>
              <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-5">
                <div className="flex items-center gap-2 text-gray-400">
                  <TrendingDown size={16} className="text-emerald-400" />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Total interest
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-white">
                  {formatMoney(baseline.totalInterest)}
                </p>
                <p className="text-sm text-gray-400">paid over the life of your debts</p>
              </div>
              <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0f172a] to-[#0b1220] p-5">
                <div className="flex items-center gap-2 text-gray-400">
                  <TrendingDown size={16} className="text-emerald-400" />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    Potential savings
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-emerald-400">
                  {formatMoney(potentialSavings)}
                </p>
                <p className="text-sm text-gray-400">in interest, paying {formatMoney(EXTRA_PREVIEW)} extra/mo</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-700 bg-[#0f172a] p-5">
            <div className="mr-auto">
              <p className="font-medium text-white">Download your full report</p>
              <p className="text-sm text-gray-400">
                A PDF summary of your debts, bills, and goals.
              </p>
            </div>
            <DownloadSummaryButton />
            <Link
              href="/amortization"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-[#1a233a]"
            >
              View full Payoff Plan
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
