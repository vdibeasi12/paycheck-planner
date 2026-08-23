'use client'

import { Zap } from 'lucide-react'

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
        <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-3">{eyebrow}</div>
        <h2 className="text-3xl md:text-[46px] font-extrabold leading-tight mb-4">{heading}</h2>
        <p className="text-gray-300 text-[17px] leading-relaxed">{desc}</p>
      </div>

      {/* The dominant result */}
      <div className="text-center mb-16 md:mb-20">
        <div className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">
          <Zap size={14} className="text-green-400" />
          Debt-free, sooner
        </div>
        <div className="text-[72px] sm:text-[100px] md:text-[128px] leading-[0.9] font-extrabold tracking-tight bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
          7 Months
        </div>
        <div className="text-2xl md:text-4xl font-extrabold text-gray-200 -mt-1 md:-mt-2">Sooner</div>
      </div>

      {/* Two parallel timeline tracks */}
      <div className="bg-[#0b1220] border border-white/10 rounded-[28px] p-6 sm:p-10 md:p-12 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-10">
          {/* Current path */}
          <div>
            <div className="flex items-center justify-between mb-3 gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-400">
                <span className="w-2 h-2 rounded-full bg-gray-500 shrink-0" />
                Current Path
              </span>
              <span className="text-sm font-extrabold tabular-nums text-gray-300">Oct 2029</span>
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
              <span className="inline-flex items-center gap-2 text-sm font-bold text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                Optimized Plan
              </span>
              <span className="text-sm font-extrabold tabular-nums text-green-400">March 2029</span>
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

        {/* Supporting figures */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-8 mt-10 pt-8 border-t border-white/10">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">Balance Today</div>
            <div className="text-xl sm:text-2xl font-extrabold tabular-nums">$18,400</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">Interest Saved</div>
            <div className="text-xl sm:text-2xl font-extrabold tabular-nums text-green-400">$2,150</div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1.5">Debt-Free Date</div>
            <div className="text-xl sm:text-2xl font-extrabold tabular-nums text-green-400">March 2029</div>
          </div>
        </div>
      </div>
    </section>
  )
}
