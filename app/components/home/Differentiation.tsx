'use client'

import { ArrowRight, HelpCircle, Wallet, Receipt, TrendingDown, PiggyBank, LineChart } from 'lucide-react'

const TRADITIONAL = ['Income', 'Monthly Budget', 'Hope It Works']

const PAYCHECK_PLANNER = [
  { label: 'Paycheck', icon: Wallet },
  { label: 'Bills', icon: Receipt },
  { label: 'Debt', icon: TrendingDown },
  { label: 'Savings', icon: PiggyBank },
  { label: 'Available', icon: Wallet },
  { label: 'Progress', icon: LineChart },
]

/**
 * Why Paycheck Planner isn't "just another budgeting app." Communicated as
 * two literal flows rather than marketing cards: a flat, muted, three-step
 * budget guess vs. a colorful six-step, paycheck-based cash-flow plan. The
 * second flow is deliberately given more visual weight -- bigger nodes,
 * color, motion in the connecting line -- so the contrast reads instantly.
 */
export default function Differentiation({
  eyebrow,
  heading,
  desc,
  traditionalLabel,
  plannerLabel,
}: {
  eyebrow: string
  heading: string
  desc: string
  traditionalLabel: string
  plannerLabel: string
}) {
  return (
    <section className="relative z-10 max-w-5xl mx-auto px-6 py-24 md:py-32">
      <div className="text-center max-w-2xl mx-auto mb-14 md:mb-16">
        <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-3">{eyebrow}</div>
        <h2 className="text-3xl md:text-[46px] font-extrabold leading-tight mb-4">{heading}</h2>
        <p className="text-gray-300 text-[17px] leading-relaxed">{desc}</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Traditional budgeting -- flat, muted */}
        <div className="rounded-[24px] border border-white/5 bg-white/[0.02] px-6 sm:px-9 py-8">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-5">{traditionalLabel}</div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3">
            {TRADITIONAL.map((step, i) => (
              <div key={step} className="flex items-center gap-2.5">
                <span className="inline-flex items-center rounded-full border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-500">
                  {step}
                </span>
                {i < TRADITIONAL.length - 1 && <ArrowRight size={15} className="text-gray-700 shrink-0" />}
              </div>
            ))}
            <HelpCircle size={17} className="text-gray-700 shrink-0 ml-0.5" />
          </div>
        </div>

        {/* Paycheck Planner -- vibrant, dominant */}
        <div className="rounded-[24px] border border-green-500/25 bg-gradient-to-br from-green-500/[0.08] to-transparent px-6 sm:px-9 py-9 sm:py-10 shadow-[0_24px_64px_rgba(34,197,94,0.08)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-green-400 mb-6">{plannerLabel}</div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-4">
            {PAYCHECK_PLANNER.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/10 px-4 py-2.5 text-sm font-bold text-white">
                  <step.icon size={14} className="text-green-400" />
                  {step.label}
                </span>
                {i < PAYCHECK_PLANNER.length - 1 && <ArrowRight size={16} className="text-green-500/60 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
