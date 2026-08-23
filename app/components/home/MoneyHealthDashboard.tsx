'use client'

import Link from 'next/link'
import { Activity, Receipt, TrendingDown, PiggyBank, Wallet, CheckCircle2 } from 'lucide-react'
import { trackCta } from '@/lib/trackClient'

const TILES = [
  { key: 'cashflow', label: 'Cash Flow Health', value: 90, display: '90', suffix: '/100', icon: Activity, color: '#22c55e' },
  { key: 'bills', label: 'Bills Covered', value: 100, display: '100', suffix: '%', icon: Receipt, color: '#3b82f6' },
  { key: 'debt', label: 'Debt Progress', value: 68, display: '68', suffix: '%', icon: TrendingDown, color: '#a78bfa' },
  { key: 'savings', label: 'Savings Progress', value: 60, display: '60', suffix: '%', icon: PiggyBank, color: '#34d399' },
]

const MILESTONES = [
  { label: 'Emergency Fund Started', done: true },
  { label: 'First Debt Paid Off', done: true },
  { label: '3-Month Streak', done: false },
]

/**
 * "This app tells me how healthy my money actually is." Rebuilt Aug 2026 to
 * consolidate what used to be two separate homepage sections (a ring+bars
 * "Money Score" block, and a duplicate ring+milestones "See Your Progress"
 * showcase further down the page) into one real dashboard: a score ring
 * plus independent metric tiles, each carrying its own visual indicator,
 * with progress milestones as a supporting strip underneath.
 */
export default function MoneyHealthDashboard({
  eyebrow,
  heading,
  desc,
  ctaLabel,
}: {
  eyebrow: string
  heading: string
  desc: string
  ctaLabel: string
}) {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-24 md:py-32">
      <div className="text-center max-w-2xl mx-auto mb-14 md:mb-16">
        <div className="text-sm font-bold uppercase tracking-wider text-green-500 mb-4">{eyebrow}</div>
        <h2 className="text-[34px] md:text-[50px] font-extrabold leading-[1.05] mb-5">{heading}</h2>
        <p className="text-gray-300 text-lg md:text-xl leading-relaxed">{desc}</p>
      </div>

      <div className="bg-[#0b1220] border border-white/10 rounded-[28px] p-6 sm:p-10 md:p-12 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="grid md:grid-cols-[auto_1fr] gap-10 md:gap-14 items-center">
          {/* Score ring -- the headline figure */}
          <div className="relative flex flex-col items-center gap-3 mx-auto md:mx-0 shrink-0">
            <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[220px] h-[220px] rounded-full bg-green-500/20 blur-[50px]" aria-hidden="true" />
            <div
              className="relative w-[200px] h-[200px] rounded-full flex items-center justify-center"
              style={{ background: 'conic-gradient(#22c55e 0% 78%, rgba(255,255,255,0.08) 78% 100%)' }}
            >
              <div className="w-[158px] h-[158px] rounded-full bg-[#0b1220] flex flex-col items-center justify-center">
                <div className="text-[64px] leading-none font-extrabold tabular-nums">78</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mt-2">Money Score</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-green-500/15 border border-green-500/30 px-3 py-1.5 text-xs font-bold text-green-400 uppercase tracking-wide">
                Good
              </span>
              <span className="text-base font-semibold text-green-400">&uarr; 6 pts this month</span>
            </div>
          </div>

          {/* Metric tiles -- a real dashboard grid, each tile owning its own
              indicator. Value is the dominant element in each tile, not the label. */}
          <div className="grid sm:grid-cols-2 gap-4">
            {TILES.map((tile) => (
              <div key={tile.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                    <tile.icon size={14} style={{ color: tile.color }} />
                    {tile.label}
                  </div>
                </div>
                <div className="text-3xl font-extrabold tabular-nums mb-3" style={{ color: tile.color }}>
                  {tile.display}
                  <span className="text-lg text-gray-500 font-semibold">{tile.suffix}</span>
                </div>
                <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${tile.value}%`, backgroundColor: tile.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Milestone strip -- progress made tangible, folded in rather than
            given its own competing section further down the page. */}
        <div className="mt-8 md:mt-10 pt-7 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex flex-wrap gap-x-7 gap-y-3">
            {MILESTONES.map((m) => (
              <div key={m.label} className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    m.done ? 'bg-green-500/15 border border-green-500/40' : 'border border-gray-700'
                  }`}
                >
                  {m.done ? <CheckCircle2 size={11} className="text-green-400" /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />}
                </span>
                <span className={`text-sm ${m.done ? 'text-gray-200 font-semibold' : 'text-gray-500'}`}>{m.label}</span>
              </div>
            ))}
          </div>
          <Link
            href="/money-score"
            onClick={() => trackCta('money_score_hero')}
            className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-black font-bold px-7 py-3.5 rounded-xl text-[15px] transition shrink-0"
          >
            {ctaLabel} &rarr;
          </Link>
        </div>
      </div>
    </section>
  )
}
