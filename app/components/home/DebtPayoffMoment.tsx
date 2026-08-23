'use client'

import { Zap, ArrowRight } from 'lucide-react'

/**
 * The debt-payoff "before vs after" moment. Rebuilt Aug 2026: instead of a
 * headline number sitting above a strategy-vs-strategy comparison, this is
 * now two literal timeline tracks -- Current Path vs Optimized Plan -- so
 * the acceleration is something you can see (a visibly shorter track, a
 * closer end-dot) rather than something you have to read off two dates.
 * Figures are illustrative, matching the sample data used throughout the
 * homepage (see app/page.tsx comment on the hero's sample data).
 */
export default function DebtPayoffMoment({
  eyebrow,
  heading,
  desc,
}: {
  eyebrow: string
  heading: string
  desc: string
}) {
  return (
    <section className="relative z-10 max-w-5xl mx-auto px-6 py-24 md:py-32">
      <div className="text-center max-w-2xl mx-auto mb-14 md:mb-16">
        <div className="text-sm font-bold uppercase tracking-wider text-green-500 mb-4">{eyebrow}</div>
        <h2 className="text-[34px] md:text-[50px] font-extrabold leading-[1.05] mb-5">{heading}</h2>
        <p className="text-gray-300 text-lg md:text-xl leading-relaxed">{desc}</p>
      </div>

      {/* The dominant result */}
      <div className="text-center mb-16 md:mb-20">
        <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-gray-500 mb-5">
          <Zap size={16} className="text-green-400" />
          Debt-free, sooner
        </div>
        <div className="text-[80px] sm:text-[110px] md:text-[140px] leading-[0.9] font-extrabold tracking-tight bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
          7 Months
        </div>
        <div className="text-3xl md:text-5xl font-extrabold text-gray-200 -mt-1 md:-mt-2 mb-7">Sooner</div>

        {/* Instant before/after snapshot -- Aug 23 2026 addition per Vince's
            live-site review: give the payoff away in one glance right under
            the headline, before the visitor even reaches the detailed
            timeline panel below. */}
        <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-4 rounded-full border border-white/10 bg-white/[0.03] px-5 sm:px-7 py-3.5">
          <span className="text-gray-500 font-bold tabular-nums line-through decoration-gray-600">Oct 2029</span>
          <ArrowRight size={16} className="text-gray-600 shrink-0" />
          <span className="text-green-400 font-extrabold tabular-nums text-lg">March 2029</span>
          <span className="hidden sm:inline text-white/10">|</span>
          <span className="text-green-400 font-bold text-sm">$2,150 saved</span>
        </div>
      </div>

      {/* Two parallel timeline tracks */}
      <div className="bg-[#0b1220] border border-white/10 rounded-[28px] p-6 sm:p-10 md:p-12 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-10">
          {/* Current path */}
          <div>
            <div className="flex items-center justify-between mb-3 gap-3">
              <span className="inline-flex items-center gap-2 text-base font-bold text-gray-400">
                <span className="w-2 h-2 rounded-full bg-gray-500 shrink-0" />
                Current Path
              </span>
              <span className="text-lg font-extrabold tabular-nums text-gray-300">Oct 2029</span>
            </div>
            <div className="relative h-2 rounded-full bg-white/5">
              <div className="absolute inset-y-0 left-0 rounded-full bg-gray-600" style={{ width: '100%' }} />
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gray-500 ring-4 ring-[#0b1220]" />
              <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gray-400 ring-4 ring-[#0b1220]" />
            </div>
          </div>

          {/* Optimized plan -- visibly shorter, highlighted */}
          <div>
            <div className="flex items-center justify-between mb-3 gap-3">
              <span className="inline-flex items-center gap-2 text-base font-bold text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                Optimized Plan
              </span>
              <span className="text-lg font-extrabold tabular-nums text-green-400">March 2029</span>
            </div>
            <div className="relative h-2 rounded-full bg-white/5">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-500 to-green-400 shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                style={{ width: '76%' }}
              />
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-green-500 ring-4 ring-[#0b1220]" />
              <span className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-green-400 ring-4 ring-[#0b1220]" style={{ left: 'calc(76% - 7px)' }} />
            </div>
          </div>
        </div>

        {/* Supporting figures -- number leads, label trails underneath */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 mt-10 pt-8 border-t border-white/10">
          <div>
            <div className="text-2xl sm:text-[28px] font-extrabold tabular-nums leading-none">$18,400</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mt-2">Balance Today</div>
          </div>
          <div>
            <div className="text-2xl sm:text-[28px] font-extrabold tabular-nums leading-none text-green-400">$2,150</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mt-2">Interest Saved</div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-2xl sm:text-[28px] font-extrabold tabular-nums leading-none text-green-400">March 2029</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mt-2">Debt-Free Date</div>
          </div>
        </div>
      </div>
    </section>
  )
}