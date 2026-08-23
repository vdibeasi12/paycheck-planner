'use client'

import { ArrowDown, Receipt, TrendingDown, PiggyBank, Wallet } from 'lucide-react'

const SEGMENTS = [
  { key: 'bills', label: 'Bills', amount: 1180, pct: 48, icon: Receipt, bar: 'bg-blue-500', soft: 'bg-blue-500/15', text: 'text-blue-400' },
  { key: 'debt', label: 'Debt Payment', amount: 450, pct: 18, icon: TrendingDown, bar: 'bg-violet-500', soft: 'bg-violet-500/15', text: 'text-violet-400' },
  { key: 'savings', label: 'Savings', amount: 250, pct: 10, icon: PiggyBank, bar: 'bg-emerald-500', soft: 'bg-emerald-500/15', text: 'text-emerald-400' },
  { key: 'available', label: 'Available', amount: 570, pct: 24, icon: Wallet, bar: 'bg-green-400', soft: 'bg-green-400/15', text: 'text-green-400' },
]

/**
 * "Where does my paycheck actually go?" -- the page's single strongest
 * show-don't-tell moment. One proportionally-sized bar carries the whole
 * idea; visitors should get it in about a second without reading anything.
 * Rebuilt Aug 2026 to replace the old 3-stat-block layout, which explained
 * the allocation but never actually visualized the proportions.
 */
export default function PaycheckAllocation({
  eyebrow,
  heading,
  desc,
}: {
  eyebrow: string
  heading: string
  desc: string
}) {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-24 md:py-32">
      <div className="text-center max-w-2xl mx-auto mb-14 md:mb-16">
        <div className="text-sm font-bold uppercase tracking-wider text-green-500 mb-4">{eyebrow}</div>
        <h2 className="text-[34px] md:text-[50px] font-extrabold leading-[1.05] mb-5">{heading}</h2>
        <p className="text-gray-300 text-lg md:text-xl leading-relaxed">{desc}</p>
      </div>

      {/* Paycheck -> bar */}
      <div className="flex flex-col items-center mb-3">
        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">One Paycheck</div>
        <div className="text-5xl sm:text-6xl font-extrabold tabular-nums mb-4">$2,450</div>
        <ArrowDown size={20} className="text-gray-600 mb-6" />
      </div>

      {/* The bar -- this single element is the "wow" moment */}
      <div className="rounded-2xl overflow-hidden flex h-20 sm:h-24 shadow-[0_20px_50px_rgba(0,0,0,0.35)] mb-3">
        {SEGMENTS.map((s) => (
          <div
            key={s.key}
            className={`${s.bar} flex items-center justify-center relative`}
            style={{ width: `${s.pct}%` }}
          >
            <span className="hidden sm:block text-lg md:text-xl font-extrabold text-black/80 tabular-nums">
              {s.pct}%
            </span>
          </div>
        ))}
      </div>
      <div className="flex h-1 mb-10 md:mb-14 rounded-full overflow-hidden">
        {SEGMENTS.map((s) => (
          <div key={s.key} className={`${s.bar} opacity-40`} style={{ width: `${s.pct}%` }} />
        ))}
      </div>

      {/* Callouts, one per segment -- amount leads, label trails */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex flex-col items-center text-center">
            <div className={`w-10 h-10 rounded-full ${s.soft} border border-white/10 flex items-center justify-center mb-3.5`}>
              <s.icon size={16} className={s.text} />
            </div>
            <div className="text-2xl sm:text-[28px] font-extrabold tabular-nums leading-none">${s.amount.toLocaleString()}</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mt-2.5">{s.label}</div>
            <div className={`text-sm font-semibold ${s.text} mt-0.5`}>{s.pct}% of paycheck</div>
          </div>
        ))}
      </div>
    </section>
  )
}
