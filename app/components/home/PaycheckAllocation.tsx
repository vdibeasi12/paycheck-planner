'use client'

import { ArrowDown, Receipt, TrendingDown, PiggyBank, Wallet } from 'lucide-react'

const SEGMENTS = [
  { key: 'bills', label: 'Bills', amount: 1180, pct: 48, icon: Receipt, bar: 'bg-blue-500', soft: 'bg-blue-500/15', text: 'text-blue-400' },
  { key: 'debt', label: 'Debt', amount: 450, pct: 18, icon: TrendingDown, bar: 'bg-violet-500', soft: 'bg-violet-500/15', text: 'text-violet-400' },
  { key: 'savings', label: 'Savings', amount: 250, pct: 10, icon: PiggyBank, bar: 'bg-emerald-500', soft: 'bg-emerald-500/15', text: 'text-emerald-400' },
]

/**
 * "Where does my paycheck actually go?" -- the page's single strongest
 * show-don't-tell moment. Rebuilt again Aug 23 2026 per Vince's live-site
 * review: the four equal-weight callouts explained the allocation but had
 * no emotional shape -- every number looked the same. This version is a
 * literal flow ($2,450 in -> what it covers -> $570 out) with the ending
 * number, the money the visitor actually gets to keep, staged as the
 * payoff -- larger, glowing, and visually separated from the numbers that
 * lead to it. The proportional bar is demoted to supporting detail
 * underneath rather than being the whole visualization.
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
      <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
        <div className="text-sm font-bold uppercase tracking-wider text-green-500 mb-4">{eyebrow}</div>
        <h2 className="text-[34px] md:text-[50px] font-extrabold leading-[1.05] mb-5">{heading}</h2>
        <p className="text-gray-300 text-lg md:text-xl leading-relaxed">{desc}</p>
      </div>

      {/* The flow: paycheck in -> what it covers -> what's left. This whole
          block is the "visualization" now, not the bar underneath it. */}
      <div className="flex flex-col items-center">
        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">One Paycheck</div>
        <div className="text-5xl sm:text-6xl font-extrabold tabular-nums mb-5">$2,450</div>
        <ArrowDown size={22} className="text-gray-700 mb-7" />

        {/* Supporting middle -- what it covers, deliberately quieter than
            the numbers it sits between so it reads as "on the way to", not
            a fourth equal destination. */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mb-7">
          {SEGMENTS.map((s) => (
            <div key={s.key} className="flex items-center gap-2.5">
              <span className={`w-8 h-8 rounded-full ${s.soft} border border-white/10 flex items-center justify-center shrink-0`}>
                <s.icon size={14} className={s.text} />
              </span>
              <span className="text-gray-200 font-bold tabular-nums">${s.amount.toLocaleString()}</span>
              <span className="text-gray-500 text-sm">{s.label}</span>
            </div>
          ))}
        </div>
        <ArrowDown size={22} className="text-gray-700 mb-7" />

        {/* The payoff -- what's actually theirs to spend. This is the
            emotional finale of the flow, so it gets its own glow and the
            largest treatment in the section. */}
        <div className="relative flex flex-col items-center">
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[180px] rounded-full bg-green-500/25 blur-[70px]" aria-hidden="true" />
          <div className="relative flex items-center gap-2 mb-1">
            <Wallet size={22} className="text-green-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-green-400">Available to Spend</span>
          </div>
          <div className="relative text-6xl sm:text-7xl font-extrabold tabular-nums leading-none bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent py-2">
            $570
          </div>
        </div>
      </div>

      {/* Supporting detail -- the proportional bar, demoted underneath the
          flow above rather than carrying the section on its own. */}
      <div className="max-w-2xl mx-auto mt-16 md:mt-20">
        <div className="rounded-2xl overflow-hidden flex h-8 shadow-[0_12px_30px_rgba(0,0,0,0.3)] mb-2">
          {[...SEGMENTS, { key: 'available', label: 'Available', amount: 570, pct: 24, bar: 'bg-green-400' }].map((s) => (
            <div key={s.key} className={s.bar} style={{ width: `${s.pct}%` }} />
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-gray-500 font-semibold uppercase tracking-wide">
          <span>48% Bills</span>
          <span>18% Debt</span>
          <span>10% Savings</span>
          <span className="text-green-400">24% Available</span>
        </div>
      </div>
    </section>
  )
}