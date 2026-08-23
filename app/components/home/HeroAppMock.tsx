'use client'

import { Receipt, TrendingDown, PiggyBank, Wallet, Bell, ChevronRight, Sparkles } from 'lucide-react'

// A quiet 8-point cash-flow trend line behind the paycheck figure -- purely
// visual (no new copy), added Aug 23 2026 so the window reads as a real
// product screen with real underlying data rather than a static marketing
// card. Illustrative, matching the sample data used throughout the mock.
const SPARK_POINTS = '0,34 20,30 40,32 60,22 80,25 100,14 120,18 140,4'

/**
 * The hero's right-hand visual. This is deliberately built as a small,
 * self-contained "app window" -- header/tab chrome, a 2x2 stat grid, a
 * score + debt-progress row, and an upcoming-obligations list -- rather
 * than a single stat card. The goal (Aug 2026 composition rebuild) is that
 * this reads as a real product screen a visitor could actually be looking
 * at, not a marketing card that happens to contain numbers.
 */
export default function HeroAppMock({ nextPaycheckLabel }: { nextPaycheckLabel: string }) {
  return (
    <div className="relative w-full">
      {/* Depth layers behind the window so it feels lifted off the page,
          not just another bordered box sitting flush with everything else. */}
      <div className="absolute -inset-5 md:-inset-8 rounded-[40px] bg-gradient-to-br from-green-500/15 via-transparent to-blue-500/15 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-4 -bottom-4 w-full h-full rounded-[28px] border border-white/5 bg-white/[0.02]" aria-hidden="true" />

      <div className="relative bg-[#0b1220] border border-white/10 rounded-[28px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.55)]">
        {/* App chrome */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            </span>
            <span className="text-xs font-bold text-gray-300 ml-1.5">Paycheck Planner</span>
          </div>
          <span className="relative w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <Bell size={13} className="text-gray-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 ring-2 ring-[#0b1220]" />
          </span>
        </div>

        {/* Compact tab row -- context, not full navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3.5">
          {['Overview', 'Bills', 'Debt', 'Goals'].map((tab, i) => (
            <span
              key={tab}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                i === 0 ? 'bg-white/10 text-white' : 'text-gray-500'
              }`}
            >
              {tab}
            </span>
          ))}
        </div>

        <div className="px-5 sm:px-7 pt-5 pb-6">
          {/* Next paycheck -- the single dominant figure. Number leads,
              label trails underneath it (not the other way around) so the
              money is what the eye hits first. */}
          <div className="relative flex items-start justify-between gap-4 mb-7">
            {/* Faint trend line behind the figure -- depth, not decoration
                for its own sake: it's the kind of chart a real cash-flow
                screen would actually show. */}
            <svg
              className="pointer-events-none absolute -left-1 top-1 w-[150px] h-[42px] opacity-[0.35]"
              viewBox="0 0 140 38"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline points={`${SPARK_POINTS} 140,38 0,38`} fill="url(#sparkFill)" stroke="none" />
              <polyline points={SPARK_POINTS} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="relative">
              <div className="text-[52px] sm:text-[60px] leading-none font-extrabold tabular-nums">$2,450</div>
              <div className="text-[13px] font-bold uppercase tracking-wider text-gray-500 mt-2.5">Next Paycheck</div>
              <div className="text-xs text-gray-500 mt-1">{nextPaycheckLabel}</div>
            </div>
            <div className="relative inline-flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/30 px-3 py-1.5 text-xs font-semibold text-green-400 shrink-0 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              On track
            </div>
          </div>

          {/* 2x2 allocation grid -- each figure is its own tile, not a row.
              Value leads (big), label trails (small) in every tile. */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: 'Bills', value: '$1,180', icon: Receipt, color: 'text-blue-400' },
              { label: 'Debt Payment', value: '$450', icon: TrendingDown, color: 'text-green-400' },
              { label: 'Savings', value: '$250', icon: PiggyBank, color: 'text-emerald-400' },
              { label: 'Available', value: '$570', icon: Wallet, color: 'text-white', highlight: true },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-xl px-4 py-3.5 border ${
                  s.highlight ? 'bg-green-500/10 border-green-500/30' : 'bg-white/[0.03] border-white/10'
                }`}
              >
                <div className={`text-2xl sm:text-[28px] font-extrabold tabular-nums leading-none ${s.highlight ? 'text-green-400' : 'text-white'}`}>{s.value}</div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500 mt-2">
                  <s.icon size={12} className={s.color} />
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Money score + debt progress side by side -- both lead with
              their number, not their label. */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl px-4 py-3.5 border border-white/10 bg-white/[0.03] flex items-center gap-3.5">
              <div
                className="relative w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'conic-gradient(#22c55e 0% 78%, rgba(255,255,255,0.1) 78% 100%)' }}
              >
                <div className="w-10 h-10 rounded-full bg-[#0b1220] flex items-center justify-center text-lg font-extrabold tabular-nums">78</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Money Score</div>
                <div className="text-sm font-semibold text-green-400">Good &uarr;</div>
              </div>
            </div>
            <div className="rounded-xl px-4 py-3.5 border border-white/10 bg-white/[0.03]">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-2xl font-extrabold tabular-nums text-white">68%</span>
                <span className="text-[10px] text-gray-500">$6,120 left</span>
              </div>
              <div className="bg-white/10 rounded-full h-1.5 overflow-hidden mb-1.5">
                <div className="bg-gradient-to-r from-green-500 to-green-400 h-full rounded-full" style={{ width: '68%' }} />
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Debt Progress</div>
            </div>
          </div>

          {/* Upcoming obligations */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Upcoming</span>
              <ChevronRight size={12} className="text-gray-600" />
            </div>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Rent', date: 'Aug 29' },
                { label: 'Car payment', date: 'Sep 2' },
              ].map((o) => (
                <div key={o.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{o.label}</span>
                  <span className="text-gray-500 tabular-nums">{o.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating callout -- small, secondary, reinforces "planned" without
          competing with the main window for attention. */}
      <div className="hidden lg:flex absolute -left-8 bottom-10 items-center gap-2 bg-[#0b1220] border border-white/10 rounded-2xl px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
        <Sparkles size={14} className="text-green-400" />
        <span className="text-xs font-semibold text-gray-200">Every dollar has a job</span>
      </div>
    </div>
  )
}