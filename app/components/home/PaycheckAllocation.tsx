'use client'

import { useState } from 'react'
import { ArrowDown, Receipt, TrendingDown, PiggyBank, Wallet } from 'lucide-react'

const ALLOCATION = [
  { key: 'bills', label: 'Bills', pct: 48, icon: Receipt, soft: 'bg-blue-500/15', text: 'text-blue-400', bar: 'bg-blue-500' },
  { key: 'debt', label: 'Debt', pct: 18, icon: TrendingDown, soft: 'bg-violet-500/15', text: 'text-violet-400', bar: 'bg-violet-500' },
  { key: 'savings', label: 'Savings', pct: 10, icon: PiggyBank, soft: 'bg-emerald-500/15', text: 'text-emerald-400', bar: 'bg-emerald-500' },
] as const

const AVAILABLE_PCT = 100 - ALLOCATION.reduce((sum, s) => sum + s.pct, 0) // 24

const MIN_PAYCHECK = 500
const MAX_PAYCHECK = 10000
const DEFAULT_PAYCHECK = 2450

/**
 * "Where does my paycheck actually go?" -- the page's single strongest
 * show-don't-tell moment. Made interactive Sep 2026 (competitive review vs.
 * a similarly-named competitor whose homepage lets visitors drag a paycheck-
 * amount slider before signing up): the flow itself ($X in -> what it
 * covers -> what's left) already told the right story, it just used one
 * frozen example number. Now the slider drives the same illustrative 48/
 * 18/10/24 split live, so a visitor can drop in their own paycheck and see
 * it react instantly, with zero signup -- same "try it yourself" hook,
 * backed by our actual product's real allocation logic once they do sign up
 * (unlike a canned demo).
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
  const [paycheck, setPaycheck] = useState(DEFAULT_PAYCHECK)

  const segments = ALLOCATION.map((s) => ({
    ...s,
    amount: Math.round((paycheck * s.pct) / 100),
  }))
  const available = paycheck - segments.reduce((sum, s) => sum + s.amount, 0)

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
        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
          One Paycheck &mdash; Try It Yourself
        </div>
        <div className="text-5xl sm:text-6xl font-extrabold tabular-nums mb-6 tracking-tight">
          ${paycheck.toLocaleString()}
        </div>

        {/* Interactive slider -- the whole point of this section now.
            accent-* lets the native range thumb/track pick up the brand
            green with zero custom CSS, in every evergreen browser. */}
        <div className="w-full max-w-xs mb-9">
          <input
            type="range"
            min={MIN_PAYCHECK}
            max={MAX_PAYCHECK}
            step={10}
            value={paycheck}
            onChange={(e) => setPaycheck(Number(e.target.value))}
            className="w-full h-2 accent-green-500 cursor-pointer"
            aria-label="Adjust your paycheck amount"
          />
          <div className="flex justify-between text-xs text-gray-500 font-semibold mt-2">
            <span>${MIN_PAYCHECK.toLocaleString()}</span>
            <span>${MAX_PAYCHECK.toLocaleString()}</span>
          </div>
        </div>

        <ArrowDown size={22} className="text-gray-700 mb-7" />

        {/* Supporting middle -- what it covers, deliberately quieter than
            the numbers it sits between so it reads as "on the way to", not
            a fourth equal destination. */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mb-7">
          {segments.map((s) => (
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
            ${available.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Supporting detail -- the proportional bar, demoted underneath the
          flow above rather than carrying the section on its own. Percentages
          are the fixed illustrative split; only the dollar amounts above
          move with the slider. */}
      <div className="max-w-2xl mx-auto mt-16 md:mt-20">
        <div className="rounded-2xl overflow-hidden flex h-8 shadow-[0_12px_30px_rgba(0,0,0,0.3)] mb-2">
          {[...ALLOCATION, { key: 'available', bar: 'bg-green-400', pct: AVAILABLE_PCT }].map((s) => (
            <div key={s.key} className={s.bar} style={{ width: `${s.pct}%` }} />
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-gray-500 font-semibold uppercase tracking-wide">
          <span>{ALLOCATION[0].pct}% Bills</span>
          <span>{ALLOCATION[1].pct}% Debt</span>
          <span>{ALLOCATION[2].pct}% Savings</span>
          <span className="text-green-400">{AVAILABLE_PCT}% Available</span>
        </div>
      </div>
    </section>
  )
}