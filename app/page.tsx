'use client'

import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Smartphone, Receipt, TrendingDown, PiggyBank, Home, Calendar, User } from 'lucide-react'
import MemberMilestone from './components/MemberMilestone'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { trackCta } from '@/lib/trackClient'
import { isNativeApp } from '@/lib/platform'
import { supabase } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/withTimeout'
import { PaycheckPlannerLogo } from './components/PaycheckPlannerLogo'

// SSR can't tell native from web, so it always renders this page's real
// return value below -- fine, since useLayoutEffect (guarded here so it
// doesn't warn during SSR) runs and corrects things before the browser
// paints, never after.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default function HomePage() {
  const { t } = useLocale()

  // Capacitor's server.url has no path of its own, so ANY webview repaint on
  // native -- not just a true cold start, but also Android recreating the
  // host Activity after the Google OAuth Custom Tab backgrounds it (common
  // under memory pressure / "don't keep activities") -- always paints this
  // marketing page first. NativeInit.tsx (mounted alongside every page, see
  // app/layout.tsx) handles the OAuth callback and hard-navigates away once
  // it's done, but that involves dynamic plugin imports plus a listener /
  // getLaunchUrl check, so there's a real window where this page is what's
  // actually on screen. That's the "hits the main page then refreshes"
  // symptom. `ready` starts true so the server-rendered HTML (identical for
  // web and native -- the server has no way to tell them apart) matches the
  // very first client paint with no hydration mismatch; the layout effect
  // below then corrects BEFORE the browser paints anything, so a native user
  // never sees this page interactive while a sign-in might be resolving
  // underneath it. Web is unaffected -- isNativeApp() is false there and
  // this effect returns immediately, every time.
  const [ready, setReady] = useState(true)

  useIsoLayoutEffect(() => {
    if (!isNativeApp()) return
    setReady(false)

    let cancelled = false
    const reveal = () => {
      if (!cancelled) setReady(true)
    }
    // Hard safety net: whatever happens below, never leave a genuine
    // logged-out native user staring at a loading screen forever.
    const safety = setTimeout(reveal, 4000)

    ;(async () => {
      try {
        // Already signed in (session persisted from a previous visit) --
        // skip marketing content entirely and go straight into the app.
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          3000,
          { data: { session: null } } as any
        )
        if (!cancelled && data?.session) {
          window.location.href = '/dashboard'
          return
        }
      } catch {
        /* no session available yet -- fall through to the launch-url check */
      }

      try {
        const { App } = await import('@capacitor/app')
        const launch = await App.getLaunchUrl()
        if (!cancelled && launch?.url?.includes('auth-callback')) {
          // NativeInit is handling this exact URL right now and will hard-
          // navigate away in a moment -- stay hidden, don't reveal marketing
          // content underneath it only to yank it away again.
          return
        }
      } catch {
        /* getLaunchUrl isn't available on every platform/version */
      }

      clearTimeout(safety)
      reveal()
    })()

    return () => {
      cancelled = true
      clearTimeout(safety)
    }
  }, [])

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#020617] flex items-center justify-center">
        <PaycheckPlannerLogo size={40} className="opacity-80" />
      </main>
    )
  }

  const features = [
    { title: t('home.feature1Title'), desc: t('home.feature1Desc') },
    { title: t('home.feature2Title'), desc: t('home.feature2Desc') },
    { title: t('home.feature3Title'), desc: t('home.feature3Desc') },
    { title: t('home.feature4Title'), desc: t('home.feature4Desc') },
    { title: t('home.feature5Title'), desc: t('home.feature5Desc') },
    { title: t('home.feature6Title'), desc: t('home.feature6Desc') },
  ]

  // Illustrative sample data for the hero/showcase visuals below -- these are
  // stand-ins showing what the real dashboard looks like, not aggregate
  // claims about actual users (see Aug 23 2026 homepage redesign notes: the
  // old "users see results in 24-36 months" stat was dropped for exactly
  // this reason). The one piece that's real is the paycheck date, computed
  // client-side so the hero never shows a stale day of the week.
  const nextPaycheckLabel = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const now = new Date()
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7
    const next = new Date(now)
    next.setDate(now.getDate() + daysUntilFriday)
    return `${days[next.getDay()]}, ${months[next.getMonth()]} ${next.getDate()}`
  }, [])

  return (
    <main className="min-h-screen bg-[#020617] text-white relative overflow-hidden">
      {/* Ambient full-bleed background glow -- Vince's Aug 23 2026 feedback:
          the page felt "blank on both sides" on wide screens because every
          section is a centered max-w column against flat black with nothing
          filling the margins. These are large, softly blurred color blobs
          pinned to the far edges of the viewport (not the content column),
          so wide monitors get ambient light in the gutters instead of empty
          black, while the readable content width is untouched. Purely
          decorative -- pointer-events-none, sits behind everything (z-0). */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-[10%] top-[-5%] w-[600px] h-[600px] rounded-full bg-green-500/10 blur-[140px]" />
        <div className="absolute -right-[10%] top-[15%] w-[560px] h-[560px] rounded-full bg-blue-500/10 blur-[140px]" />
        <div className="absolute -left-[8%] top-[60%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="absolute -right-[8%] top-[85%] w-[500px] h-[500px] rounded-full bg-green-500/10 blur-[140px]" />
      </div>

      {/* Hero Section -- Aug 23 2026 "make it feel like you're looking into
          the app, not at a dashboard mockup" pass: the visual panel now
          takes a dominant share of the grid (not a 50/50 split) and every
          number inside it is scaled up so the eye lands on the money, not
          the chrome around it. */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-28 md:py-32">
        <div className="grid md:grid-cols-[1fr_1.3fr] gap-14 lg:gap-20 items-center">
          <div>
            <h1 className="text-4xl md:text-[64px] font-extrabold mb-6 leading-[1.05] tracking-tight max-w-[560px]">
              {t('home.heroPrefix')}<br />
              <span className="text-green-500">{t('home.heroHighlight')}</span>{t('home.heroSuffix')}
            </h1>
            <p className="text-base md:text-[18px] text-gray-300 mb-9 leading-relaxed max-w-[480px]">
              {t('home.heroSubtitle')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/signup"
                onClick={() => trackCta('get_started_hero')}
                className="bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-4 rounded-xl text-base transition"
              >
                {t('home.ctaStartFree')}
              </Link>
              <Link
                href="#how-it-works"
                onClick={() => trackCta('see_how_it_works_hero')}
                className="border border-gray-700 text-white hover:border-gray-500 font-bold px-8 py-4 rounded-xl text-base transition"
              >
                {t('home.ctaSeeHowItWorks')}
              </Link>
            </div>
          </div>

          {/* Dashboard preview card -- illustrative, mirrors the real
              paycheck-breakdown view inside the app. Enlarged per Vince's
              Aug 23 2026 "big paycheck, big allocation, big available
              balance" feedback: the allocation rows became a 3-up stat
              grid, Available/Progress became the dominant closing stat
              instead of a small side gauge, and every figure is bigger
              relative to its label so the numbers -- not the card chrome
              -- carry the visual weight. */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-[28px] overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.35)]">
            {/* Header band -- reads as "app chrome" before it reads as
                "content," so the panel feels like a live screen rather
                than a marketing card. */}
            <div
              className="flex items-center justify-between px-9 md:px-10 py-6 border-b border-white/5"
              style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.14), transparent 75%)' }}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('home.dashLabel')}</div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/30 px-2.5 py-1 text-[11px] font-semibold text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                {t('home.dashOnTrack')}
              </div>
            </div>

            <div className="px-9 md:px-10 pt-8 pb-10">
              <div className="text-[56px] md:text-[72px] leading-none font-extrabold mb-2 tabular-nums">$2,450</div>
              <div className="text-sm text-gray-400 mb-9">{nextPaycheckLabel}</div>

              <div className="grid grid-cols-3 gap-4 sm:gap-8 pb-8 border-b border-white/5">
                <div>
                  <div className="flex items-start gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 min-h-[28px] leading-tight">
                    <Receipt size={12} className="text-blue-400 shrink-0 mt-0.5" />
                    {t('home.dashBills')}
                  </div>
                  <div className="text-2xl md:text-[30px] font-extrabold tabular-nums">$1,180</div>
                </div>
                <div>
                  <div className="flex items-start gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 min-h-[28px] leading-tight">
                    <TrendingDown size={12} className="text-green-400 shrink-0 mt-0.5" />
                    {t('home.dashDebtPayment')}
                  </div>
                  <div className="text-2xl md:text-[30px] font-extrabold tabular-nums">$450</div>
                </div>
                <div>
                  <div className="flex items-start gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 min-h-[28px] leading-tight">
                    <PiggyBank size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                    {t('home.dashSavings')}
                  </div>
                  <div className="text-2xl md:text-[30px] font-extrabold tabular-nums">$250</div>
                </div>
              </div>

              {/* Available + Debt-Free Progress close the card as one big
                  paired statement -- the two numbers a visitor actually
                  cares about, given equal top billing instead of a small
                  number next to a decorative gauge. */}
              <div className="flex items-end justify-between gap-8 pt-8">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{t('home.dashAvailable')}</div>
                  <div className="text-4xl md:text-[52px] leading-none font-extrabold text-green-400 tabular-nums">$570</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{t('home.dashProgressLabel')}</div>
                  <div className="text-4xl md:text-[52px] leading-none font-extrabold tabular-nums">68%</div>
                </div>
              </div>
              <div className="bg-white/10 rounded-full h-2.5 overflow-hidden mt-6">
                <div className="bg-gradient-to-r from-green-500 to-green-400 h-full rounded-full" style={{ width: '68%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value props -- what the product actually does, not generic marketing
          stats. Rebuilt Aug 23 2026 per Vince's "stop designing this around
          cards" feedback: one large editorial statement instead of three
          bordered boxes, with the three ideas carried by typography
          (an eyebrow label + a line of copy, nothing boxed) rather than
          colored accent bars and icon badges. */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24 md:pb-32 text-center">
        <h2 className="text-3xl md:text-[46px] font-extrabold leading-tight mb-16 md:mb-20 max-w-2xl mx-auto">
          {t('home.valuePropHeading')}
        </h2>
        <div className="grid md:grid-cols-3 gap-x-10 gap-y-12">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-3">{t('home.valuePlanEyebrow')}</div>
            <p className="text-lg md:text-xl font-semibold text-gray-200 leading-snug">{t('home.statPayoffDesc')}</p>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">{t('home.valuePayoffEyebrow')}</div>
            <p className="text-lg md:text-xl font-semibold text-gray-200 leading-snug">{t('home.statAiDesc')}</p>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">{t('home.valueSeeEyebrow')}</div>
            <p className="text-lg md:text-xl font-semibold text-gray-200 leading-snug">{t('home.statInsightsDesc')}</p>
          </div>
        </div>
      </section>

      {/* Social proof / milestone -- real live member count, not a fabricated number */}
      <MemberMilestone />

      {/* Money Score -- moved up from its old spot near the bottom of the
          page per the Aug 23 2026 redesign: it's a low-commitment top-of-
          funnel tool (no account needed), so it earns a place right after
          the hero instead of being buried below the feature grid. */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
        <div className="rounded-[20px] border border-white/10 p-10 md:p-14 grid md:grid-cols-[1fr_auto] gap-12 items-center"
             style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12), transparent 60%)' }}>
          <div>
            <h2 className="text-3xl md:text-[46px] font-extrabold mb-4 leading-tight">{t('home.moneyScoreHeading')}</h2>
            <p className="text-gray-300 text-[17px] leading-relaxed max-w-[480px] mb-7">{t('home.moneyScoreDesc')}</p>
            <Link
              href="/money-score"
              onClick={() => trackCta('money_score_hero')}
              className="inline-block bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-4 rounded-xl text-base transition"
            >
              {t('home.moneyScoreCta')} &rarr;
            </Link>
          </div>
          {/* Restyled Aug 23 2026 as a financial-health report rather than a
              standalone gauge widget: the ring still carries the headline
              number, but the category bars (reordered so the strongest
              category leads) and a plain-language read of what they mean
              now sit underneath it as one continuous report, not a
              decorative afterthought. */}
          <div className="flex flex-col gap-8 shrink-0 mx-auto w-full max-w-[340px]">
            <div className="relative flex flex-col items-center gap-3">
              <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[220px] h-[220px] rounded-full bg-green-500/20 blur-[50px]" aria-hidden="true" />
              <div
                className="relative w-[200px] h-[200px] rounded-full flex items-center justify-center"
                style={{ background: 'conic-gradient(#22c55e 0% 78%, rgba(255,255,255,0.08) 78% 100%)' }}
              >
                <div className="w-[158px] h-[158px] rounded-full bg-[#020617] flex flex-col items-center justify-center">
                  <div className="text-[60px] leading-none font-extrabold tabular-nums">78</div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-wide mt-1.5">{t('home.moneyScoreLabel')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-green-500/15 border border-green-500/30 px-2.5 py-1 text-[11px] font-bold text-green-400 uppercase tracking-wide">
                  {t('home.moneyScoreRating')}
                </span>
                <span className="text-sm font-semibold text-green-400">{t('home.moneyScoreTrend')}</span>
              </div>
            </div>

            {/* Category breakdown -- illustrative bars showing what the
                Money Score is actually made of. Same categories
                moneyScoreDesc already promises (budgeting, savings, debt,
                cash flow); values are sample data matching the illustrative
                78 score above, not a real user's numbers. Cash Flow leads
                since it's the standout figure the narrative below refers to. */}
            <div className="flex flex-col gap-3.5">
              {[
                { label: t('home.moneyScoreCashFlow'), pct: 90 },
                { label: t('home.moneyScoreDebt'), pct: 80 },
                { label: t('home.moneyScoreSavings'), pct: 60 },
                { label: t('home.moneyScoreBudgeting'), pct: 80 },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3">
                  <span className="w-[80px] text-xs text-gray-400 shrink-0">{c.label}</span>
                  <div className="flex-1 bg-white/10 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-400 h-full rounded-full"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-xs text-gray-500 tabular-nums shrink-0">{c.pct}</span>
                </div>
              ))}
            </div>

            <p className="text-[15px] text-gray-300 leading-relaxed border-t border-white/10 pt-6">
              {t('home.moneyScoreNarrative')}
            </p>
          </div>
        </div>
      </section>

      {/* How It Works -- new section; the product's whole value prop in three steps */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center max-w-xl mx-auto mb-16">
          <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-3">{t('home.howItWorksEyebrow')}</div>
          <h2 className="text-3xl md:text-[46px] font-extrabold leading-tight">{t('home.howItWorksHeading')}</h2>
        </div>
        {/* Aug 2026 visual pass: a hairline connector behind the step numbers
            ties the three steps into one flow on desktop -- subtle, not a
            decorative graphic. Hidden on mobile where steps stack vertically. */}
        <div className="relative grid md:grid-cols-3 gap-10">
          <div className="hidden md:block absolute top-[7px] left-[16.5%] right-[16.5%] h-px bg-white/10" aria-hidden="true" />
          {[
            { n: '01', title: t('home.step1Title'), desc: t('home.step1Desc') },
            { n: '02', title: t('home.step2Title'), desc: t('home.step2Desc') },
            { n: '03', title: t('home.step3Title'), desc: t('home.step3Desc') },
          ].map((s) => (
            <div key={s.n} className="relative text-center px-3">
              <div className="inline-block bg-[#020617] px-2 text-xs font-semibold text-gray-500 mb-3 tracking-wide">{s.n}</div>
              <h3 className="text-2xl font-extrabold mb-2">{s.title}</h3>
              <p className="text-gray-400 text-[15px] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product Showcase -- three large alternating sections, replacing the
          old flat 6-card feature grid as the primary "show, don't tell" beat.
          The six smaller feature cards still exist further down. */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
        <h2 className="text-3xl md:text-[46px] font-extrabold text-center mb-20">{t('home.showcaseHeading')}</h2>

        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-3">{t('home.showcase1Eyebrow')}</div>
            <h3 className="text-2xl md:text-[32px] font-extrabold mb-4">{t('home.showcase1Title')}</h3>
            <p className="text-gray-300 text-[17px] leading-relaxed max-w-[420px]">{t('home.showcase1Desc')}</p>
          </div>
          <div className="bg-[#0f172a] border border-gray-700 rounded-2xl p-8 md:p-10 shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
            <div className="grid grid-cols-7 gap-2 mb-5">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div
                  key={d}
                  className={`rounded-lg py-3 text-center text-xs ${
                    d === 'Thu' ? 'bg-green-500/10 border border-green-500/40 text-white font-bold' : 'bg-white/5 text-gray-400'
                  }`}
                >
                  {d}{d === 'Thu' && <><br />Pay</>}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-300 py-2 border-t border-gray-700"><span>Rent due</span><span>Aug 29</span></div>
            <div className="flex justify-between text-sm text-gray-300 py-2 border-t border-gray-700"><span>Car payment</span><span>Sep 2</span></div>
            <div className="flex justify-between text-sm text-gray-300 py-2 border-t border-gray-700"><span>Savings transfer</span><span>Sep 3</span></div>
          </div>
        </div>

        {/* 02 -- Attack Your Debt. Deliberately broken out of the alternating
            text+card rhythm the other two showcase beats use. Per Vince's
            Aug 23 2026 feedback this is the product's strongest "wow"
            moment (the debt-free date comparison), so it reads as one big
            payoff statement -- a huge headline number, then the strategy
            comparison, then the timeline -- rather than another bordered
            card competing for attention with everything else on the page. */}
        <div className="mt-28 md:mt-36">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-3">{t('home.showcase2Eyebrow')}</div>
            <h3 className="text-2xl md:text-[32px] font-extrabold mb-4">{t('home.showcase2Title')}</h3>
            <p className="text-gray-300 text-[17px] leading-relaxed max-w-[420px] mx-auto">{t('home.showcase2Desc')}</p>
          </div>

          <div className="text-center mb-14">
            <div className="text-[13px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">Debt-free, sooner</div>
            <div className="text-[68px] sm:text-[88px] md:text-[112px] leading-[0.92] font-extrabold tracking-tight bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              7 Months
            </div>
            <div className="text-2xl md:text-4xl font-extrabold text-gray-200 -mt-1 md:-mt-2">Sooner</div>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 sm:gap-10 items-center max-w-2xl mx-auto mb-16">
            <div className="text-right">
              <div className="inline-flex items-center gap-2 text-sm font-bold text-green-400 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                Avalanche
              </div>
              <div className="text-xl md:text-2xl font-extrabold tabular-nums">March 2029</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Debt-free</div>
            </div>
            <div className="text-gray-600 text-xs font-bold">VS</div>
            <div className="text-left">
              <div className="inline-flex items-center gap-2 text-sm font-bold text-blue-400 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                Snowball
              </div>
              <div className="text-xl md:text-2xl font-extrabold tabular-nums text-gray-300">October 2029</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Debt-free</div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <svg width="100%" height="160" viewBox="0 0 400 160" preserveAspectRatio="none">
              <polyline points="0,18 60,40 120,66 180,94 240,120 300,142 360,154 400,158" fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
              <polyline points="0,18 60,44 120,74 180,100 240,124 300,144 360,156 400,160" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
            </svg>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center mt-28">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-3">{t('home.showcase3Eyebrow')}</div>
            <h3 className="text-2xl md:text-[32px] font-extrabold mb-4">{t('home.showcase3Title')}</h3>
            <p className="text-gray-300 text-[17px] leading-relaxed max-w-[420px]">{t('home.showcase3Desc')}</p>
          </div>
          <div className="bg-[#0f172a] border border-gray-700 rounded-2xl p-8 md:p-10 shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-6">
              <div
                className="w-[100px] h-[100px] rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'conic-gradient(#22c55e 0% 78%, rgba(255,255,255,0.08) 78% 100%)' }}
              >
                <div className="w-[74px] h-[74px] rounded-full bg-[#0f172a] flex items-center justify-center text-xl font-extrabold">78</div>
              </div>
              <div>
                <div className="font-bold text-base mb-1">Money Score: Good</div>
                <div className="text-gray-400 text-sm">Up 6 points this month</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-6">
              <span className="text-xs px-3 py-1.5 rounded-full border border-green-500/35 bg-green-500/10 text-green-400">Emergency Fund Started</span>
              <span className="text-xs px-3 py-1.5 rounded-full border border-green-500/35 bg-green-500/10 text-green-400">First Debt Paid Off</span>
              <span className="text-xs px-3 py-1.5 rounded-full border border-gray-700 text-gray-400">3-Month Streak</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid -- deliberately quiet per Vince's Aug 23 2026
          feedback: the showcase above already demonstrated the three real
          products (planning, payoff, progress), so this list reads as
          supporting capabilities in an appendix, not a fourth "here's what
          we built" pitch. No cards, no descriptions, no icon badges --
          just a compact checklist at a fraction of the showcase's visual
          weight. */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-16 md:py-20">
        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 text-center mb-9">{t('home.featuresHeading')}</div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-10 gap-y-4">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="text-green-500/70 mt-0.5 shrink-0" size={15} />
              <span className="text-gray-400 text-sm leading-snug">{f.title}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Mobile App -- more prominent standalone section per the redesign;
          Footer.tsx also has a compact version of this (Google Play badge +
          QR code) that appears on every page -- left as-is for now. */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-5">
              <Smartphone size={18} className="text-green-400" />
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-3">{t('home.mobileEyebrow')}</div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">{t('home.mobileHeading')}</h2>
            <p className="text-gray-300 text-[17px] mb-7 max-w-[440px]">{t('home.mobileDesc')}</p>
            <div className="flex flex-wrap gap-3.5">
              <a
                href="https://play.google.com/store/apps/details?id=com.dibeasi.paycheckplanner"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackCta('google_play_hero')}
                className="flex items-center gap-2.5 border border-gray-700 rounded-xl px-5 py-3 text-sm text-gray-200 hover:border-gray-500 transition"
              >
                &#9654; {t('home.mobileGooglePlay')}
              </a>
              <span className="flex items-center gap-2.5 border border-gray-700 rounded-xl px-5 py-3 text-sm text-gray-500 opacity-60">
                {t('home.mobileAppStoreSoon')}
              </span>
            </div>
          </div>

          {/* Phone mockup -- Aug 2026 visual pass: rebuilt to look like an
              actual screenshot of the app (in-app header, real row icons,
              a progress bar under the debt-free %, bottom tab bar) instead
              of a floating icon over three plain data rows. Same illustrative
              numbers as the hero card for consistency. */}
          <div className="mx-auto w-[260px] h-[500px] rounded-[36px] border-[6px] border-gray-800 bg-[#0f172a] shadow-[0_16px_40px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden">
            <div className="w-14 h-1.5 rounded-full bg-gray-700 mx-auto mt-3 mb-2 shrink-0" />
            <div className="flex items-center justify-between px-4 py-2 shrink-0">
              <span className="text-xs font-bold text-white">Paycheck Planner</span>
              <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <User size={12} className="text-gray-400" />
              </span>
            </div>
            <div className="flex-1 px-4 pb-3 flex flex-col justify-center gap-3.5 overflow-hidden">
              <div className="bg-white/5 rounded-lg px-3 py-2.5 text-[11px] text-gray-400">
                {t('home.dashLabel')}<b className="block text-white text-base mt-0.5">$2,450.00</b>
              </div>
              <div className="flex justify-between items-center text-[11px] text-gray-400 px-1">
                <span className="flex items-center gap-1.5"><Receipt size={12} className="text-gray-500" />{t('home.dashBills')}</span><span className="text-gray-200">$1,180</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-gray-400 px-1">
                <span className="flex items-center gap-1.5"><TrendingDown size={12} className="text-gray-500" />{t('home.dashDebtPayment')}</span><span className="text-gray-200">$450</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-gray-400 px-1">
                <span className="flex items-center gap-1.5"><PiggyBank size={12} className="text-gray-500" />{t('home.dashSavings')}</span><span className="text-gray-200">$250</span>
              </div>
              <div className="bg-white/5 rounded-lg px-3 py-2.5 text-[11px] text-gray-400">
                {t('home.dashAvailable')}<b className="block text-green-400 text-base mt-0.5">$570.00</b>
              </div>
              <div className="bg-white/5 rounded-lg px-3 py-2.5 text-[11px] text-gray-400">
                {t('home.dashProgressLabel')}<b className="block text-white text-base mt-0.5">68%</b>
                <div className="bg-white/10 rounded-full h-1.5 overflow-hidden mt-1.5">
                  <div className="bg-gradient-to-r from-green-500 to-green-400 h-full rounded-full" style={{ width: '68%' }} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-around border-t border-white/10 py-3 shrink-0">
              <Home size={16} className="text-green-400" />
              <Calendar size={16} className="text-gray-600" />
              <TrendingDown size={16} className="text-gray-600" />
              <User size={16} className="text-gray-600" />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 border-t border-gray-800 py-24 md:py-32" style={{ background: 'linear-gradient(180deg, transparent, rgba(34,197,94,0.08))' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-[40px] font-extrabold mb-9 leading-tight">{t('home.ctaHeading')}</h2>
          <Link
            href="/signup"
            onClick={() => trackCta('get_started_bottom')}
            className="inline-block bg-green-500 hover:bg-green-600 text-black font-bold px-9 py-4 rounded-xl text-base transition"
          >
            {t('home.ctaStartFree')}
          </Link>
        </div>
      </section>
    </main>
  )
}
