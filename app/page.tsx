'use client'

import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Smartphone, Receipt, TrendingDown, PiggyBank, Home, Calendar, User, Wallet, Activity } from 'lucide-react'
import MemberMilestone from './components/MemberMilestone'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { trackCta } from '@/lib/trackClient'
import { isNativeApp } from '@/lib/platform'
import { supabase } from '@/lib/supabase/client'
import { withTimeout } from '@/lib/withTimeout'
import { PaycheckPlannerLogo } from './components/PaycheckPlannerLogo'
import HeroAppMock from './components/home/HeroAppMock'
import PaycheckAllocation from './components/home/PaycheckAllocation'
import MoneyHealthDashboard from './components/home/MoneyHealthDashboard'
import DebtPayoffMoment from './components/home/DebtPayoffMoment'
import Differentiation from './components/home/Differentiation'

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

  // Illustrative sample data for the hero/showcase visuals below -- these are
  // stand-ins showing what the real dashboard looks like, not aggregate
  // claims about actual users (see Aug 23 2026 homepage redesign notes: the
  // old "users see results in 24-36 months" stat was dropped for exactly
  // this reason). The one piece that's real is the paycheck date, computed
  // client-side so the hero never shows a stale day of the week.
  //
  // Moved above the `if (!ready)` return below (Aug 29 2026 fix): this hook
  // used to sit after that early return, which is a Rules-of-Hooks
  // violation -- the very first render (ready=true) called this useMemo,
  // but the very next render, triggered by setReady(false) inside the
  // useIsoLayoutEffect above, hit `if (!ready) return` and skipped it,
  // shrinking the hook count from one render to the next. React only
  // detects that on the branch where it actually happens, and `ready`
  // only ever flips to false on native (isNativeApp() true) -- see the
  // comment on the effect above -- so this only ever broke inside the
  // Android/iOS app, never on web, and crashed straight to Next.js's
  // error boundary (minified React error #300, "Rendered fewer hooks
  // than expected") with no network/WebView error involved at all.
  // Hooks must never sit after a conditional return; this one now runs
  // unconditionally on every render, used or not.
  const nextPaycheckLabel = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const now = new Date()
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7
    const next = new Date(now)
    next.setDate(now.getDate() + daysUntilFriday)
    return `${days[next.getDay()]}, ${months[next.getMonth()]} ${next.getDate()}`
  }, [])

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#020617] flex items-center justify-center">
        <PaycheckPlannerLogo size={40} className="opacity-80" />
      </main>
    )
  }

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
      {/* Perf fix (Aug 26 2026): these were four 500-600px circles each
          running a 140px CSS blur filter, stacked across the full ~7800px
          page height. `filter: blur()` at that radius is one of the more
          expensive things a browser can paint/composite -- on a mid-range
          phone it's a real source of scroll jank. Radial gradients produce
          the same soft-glow look without a blur filter at all, at a
          fraction of the render cost, so swapping to those here. */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -left-[10%] top-[-5%] w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.14) 0%, rgba(34,197,94,0) 70%)' }}
        />
        <div
          className="absolute -right-[10%] top-[15%] w-[560px] h-[560px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0) 70%)' }}
        />
        <div
          className="absolute -left-[8%] top-[60%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0) 70%)' }}
        />
        <div
          className="absolute -right-[8%] top-[85%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.14) 0%, rgba(34,197,94,0) 70%)' }}
        />
      </div>

      {/* Hero Section -- Aug 2026 composition rebuild: genuine split-screen.
          Left carries the pitch and both CTAs; right is a real multi-panel
          "app window" (HeroAppMock) with its own chrome, tabs, stat grid,
          score, debt progress, and upcoming bills -- not a single stat
          card standing in for the product. */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        {/* Aug 23 2026 feedback round 3: not a font-size problem anymore --
            the dashboard needs to be the visual centerpiece of the hero, not
            something sitting beside the copy. Right column's share of the
            row grew from ~53% to ~61% here (ratio, not text size) so the
            product mock reads as substantially larger and more dominant. */}
        <div className="grid md:grid-cols-[1fr_1.4fr] lg:grid-cols-[0.85fr_1.4fr] gap-10 lg:gap-16 items-center">
          <div>
            <h1 className="text-[44px] md:text-[72px] font-extrabold mb-7 leading-[0.98] tracking-tight max-w-[720px]">
              {t('home.heroPrefix')}<br />
              <span className="text-green-500">{t('home.heroHighlight')}</span>{t('home.heroSuffix')}
            </h1>
            <p className="text-lg md:text-[22px] text-gray-300 mb-9 leading-[1.5] max-w-[640px]">
              {t('home.heroSubtitle')}
            </p>
            <div className="flex flex-wrap gap-4 mb-7">
              <Link
                href="/signup"
                onClick={() => trackCta('get_started_hero')}
                className="bg-green-500 hover:bg-green-600 text-black font-bold px-9 py-5 rounded-xl text-[17px] transition"
              >
                {t('home.ctaStartFree')}
              </Link>
              <Link
                href="#how-it-works"
                onClick={() => trackCta('see_how_it_works_hero')}
                className="border border-gray-700 text-white hover:border-gray-500 font-bold px-9 py-5 rounded-xl text-[17px] transition"
              >
                {t('home.ctaSeeHowItWorks')}
              </Link>
            </div>
            <div className="flex items-center gap-2 text-base text-gray-500">
              <CheckCircle2 size={17} className="text-green-500/70 shrink-0" />
              {t('home.heroTrust')}
            </div>
          </div>

          <HeroAppMock nextPaycheckLabel={nextPaycheckLabel} />
        </div>
      </section>

      {/* Social proof / milestone -- real live member count, not a fabricated number */}
      <MemberMilestone />

      {/* PLAN -- "Where does my paycheck actually go?" One proportional bar
          carries the whole idea; see PaycheckAllocation for detail. */}
      <PaycheckAllocation
        eyebrow={t('home.allocationEyebrow')}
        heading={t('home.allocationHeading')}
        desc={t('home.allocationDesc')}
      />

      {/* CONTROL -- financial health as an actual dashboard, not four text
          blocks. Also folds in the progress-milestone strip that used to be
          its own separate showcase section further down the page. */}
      <MoneyHealthDashboard
        eyebrow={t('home.moneyHealthEyebrow')}
        heading={t('home.moneyHealthHeading')}
        desc={t('home.moneyHealthDesc')}
        ctaLabel={t('home.moneyScoreCta')}
      />

      {/* How It Works -- new section; the product's whole value prop in three steps */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center max-w-xl mx-auto mb-16">
          <div className="text-sm font-bold uppercase tracking-wider text-green-500 mb-4">{t('home.howItWorksEyebrow')}</div>
          <h2 className="text-[34px] md:text-[50px] font-extrabold leading-[1.05]">{t('home.howItWorksHeading')}</h2>
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
              <h3 className="text-2xl md:text-[28px] font-extrabold mb-3">{s.title}</h3>
              <p className="text-gray-400 text-base leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DEBT -- "Pay debt strategically." Rebuilt Aug 2026: the 7-months
          headline now sits above two literal timeline tracks (current path
          vs optimized plan) instead of a strategy-vs-strategy date pair, so
          the acceleration is something you see, not something you read. */}
      <DebtPayoffMoment eyebrow={t('home.debtEyebrow')} heading={t('home.debtHeading')} desc={t('home.debtDesc')} />

      {/* WHY -- Paycheck Planner vs. a traditional budgeting app, as two
          literal flows rather than marketing cards. */}
      <Differentiation
        eyebrow={t('home.diffEyebrow')}
        heading={t('home.diffHeading')}
        desc={t('home.diffDesc')}
        traditionalLabel={t('home.diffTraditionalLabel')}
        plannerLabel={t('home.diffPlannerLabel')}
      />

      {/* Outcomes -- Aug 23 2026 feedback round 3: the 6-item feature
          checklist read as a generic "every budgeting app has this" list.
          Replaced with the 3 product OUTCOMES (not feature names) that
          actually differentiate the product, given deliberately more
          breathing room each so they read as statements, not checklist
          items. Section is intentionally smaller/quieter than the major
          showcases above it -- this is supporting evidence, not a new
          "wow" moment competing with them. The old 6-feature copy stays in
          en.json (feature1-6) but is no longer rendered here. */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16 md:py-20">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-[26px] md:text-[32px] font-extrabold leading-tight mb-3">{t('home.outcomesHeading')}</h2>
          <p className="text-gray-500 text-base">{t('home.outcomesSubheading')}</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-10 sm:gap-8">
          {[
            { title: t('home.outcome1Title'), desc: t('home.outcome1Desc'), icon: Wallet },
            { title: t('home.outcome2Title'), desc: t('home.outcome2Desc'), icon: TrendingDown },
            { title: t('home.outcome3Title'), desc: t('home.outcome3Desc'), icon: Activity },
          ].map((o, i) => (
            <div key={i} className="text-center sm:text-left">
              <div className="w-11 h-11 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4 mx-auto sm:mx-0">
                <o.icon className="text-green-400" size={20} />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-2">{o.title}</div>
              <p className="text-gray-300 text-lg leading-snug">{o.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mobile App -- the homepage's one mobile-app pitch. Footer.tsx used
          to repeat this same Google Play pitch again right below it; per
          Vince's Aug 23 2026 "two separate mobile presentations" feedback,
          Footer now skips its own promo block specifically on the homepage
          (see isHomepage in Footer.tsx) so this is the only one a visitor
          sees here. */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-5">
              <Smartphone size={18} className="text-green-400" />
            </div>
            <div className="text-sm font-bold uppercase tracking-wider text-green-500 mb-4">{t('home.mobileEyebrow')}</div>
            <h2 className="text-[30px] md:text-[42px] font-extrabold mb-4 leading-tight">{t('home.mobileHeading')}</h2>
            <p className="text-gray-300 text-lg mb-7 max-w-[440px]">{t('home.mobileDesc')}</p>
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
          <div className="text-sm font-bold uppercase tracking-wider text-green-500 mb-4">{t('home.ctaEyebrow')}</div>
          <h2 className="text-[34px] md:text-[48px] font-extrabold mb-5 leading-[1.05]">{t('home.ctaHeading')}</h2>
          <p className="text-gray-400 text-lg mb-9">{t('home.ctaSubtitle')}</p>
          <Link
            href="/signup"
            onClick={() => trackCta('get_started_bottom')}
            className="inline-block bg-green-500 hover:bg-green-600 text-black font-bold px-9 py-5 rounded-xl text-[17px] transition"
          >
            {t('home.ctaStartFree')}
          </Link>
        </div>
      </section>
    </main>
  )
}