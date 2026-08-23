'use client'

import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Smartphone, Receipt, TrendingDown, PiggyBank } from 'lucide-react'
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
    <main className="min-h-screen bg-[#020617] text-white">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-24 md:py-32">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h1 className="text-4xl md:text-[60px] font-extrabold mb-6 leading-[1.08] tracking-tight max-w-[700px]">
              {t('home.heroPrefix')}<br />
              <span className="text-green-500">{t('home.heroHighlight')}</span>{t('home.heroSuffix')}
            </h1>
            <p className="text-lg md:text-[19px] text-gray-300 mb-9 leading-relaxed max-w-[560px]">
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
              paycheck-breakdown view inside the app. Polished per Vince's
              Aug 23 2026 "make it feel like a real screenshot, not a
              marketing graphic" pass: deeper shadow, row icons, an
              on-track indicator, and the numbers that matter (Available,
              progress %) pulled up to their own visual weight instead of
              matching the supporting rows. */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-[20px] p-8 shadow-[0_16px_50px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('home.dashLabel')}</div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/30 px-2.5 py-1 text-[11px] font-semibold text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                {t('home.dashOnTrack')}
              </div>
            </div>
            <div className="text-4xl font-extrabold mb-1">$2,450.00</div>
            <div className="text-sm text-gray-400 mb-7">{nextPaycheckLabel}</div>

            <div className="flex justify-between items-center text-[15px] text-gray-300 py-2.5 border-b border-white/5">
              <span className="flex items-center gap-2.5"><Receipt size={15} className="text-gray-500" />{t('home.dashBills')}</span><span>$1,180</span>
            </div>
            <div className="flex justify-between items-center text-[15px] text-gray-300 py-2.5 border-b border-white/5">
              <span className="flex items-center gap-2.5"><TrendingDown size={15} className="text-gray-500" />{t('home.dashDebtPayment')}</span><span>$450</span>
            </div>
            <div className="flex justify-between items-center text-[15px] text-gray-300 py-2.5 border-b border-white/5">
              <span className="flex items-center gap-2.5"><PiggyBank size={15} className="text-gray-500" />{t('home.dashSavings')}</span><span>$250</span>
            </div>

            <div className="flex justify-between items-end pt-5">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('home.dashAvailable')}</span>
              <span className="text-3xl font-extrabold text-green-400">$570</span>
            </div>

            <div className="flex justify-between items-baseline mt-6 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('home.dashProgressLabel')}</span>
              <span className="text-2xl font-extrabold">68%</span>
            </div>
            <div className="bg-white/10 rounded-full h-2.5 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-400 h-full rounded-full" style={{ width: '68%' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Value props -- what the product actually does, not generic marketing stats */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-7">
          <div className="border border-white/10 bg-[#0f172a]/60 rounded-2xl p-8">
            <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-2">{t('home.valuePlanEyebrow')}</div>
            <h3 className="text-xl font-bold mb-2">{t('home.statPayoffTitle')}</h3>
            <p className="text-gray-400 text-[15px] leading-relaxed">{t('home.statPayoffDesc')}</p>
          </div>
          <div className="border border-white/10 bg-[#0f172a]/60 rounded-2xl p-8">
            <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-2">{t('home.valuePayoffEyebrow')}</div>
            <h3 className="text-xl font-bold mb-2">{t('home.statAiTitle')}</h3>
            <p className="text-gray-400 text-[15px] leading-relaxed">{t('home.statAiDesc')}</p>
          </div>
          <div className="border border-white/10 bg-[#0f172a]/60 rounded-2xl p-8">
            <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-2">{t('home.valueSeeEyebrow')}</div>
            <h3 className="text-xl font-bold mb-2">{t('home.statInsightsTitle')}</h3>
            <p className="text-gray-400 text-[15px] leading-relaxed">{t('home.statInsightsDesc')}</p>
          </div>
        </div>
      </section>

      {/* Social proof / milestone -- real live member count, not a fabricated number */}
      <MemberMilestone />

      {/* Money Score -- moved up from its old spot near the bottom of the
          page per the Aug 23 2026 redesign: it's a low-commitment top-of-
          funnel tool (no account needed), so it earns a place right after
          the hero instead of being buried below the feature grid. */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-[20px] border border-white/10 p-10 md:p-14 grid md:grid-cols-[1fr_auto] gap-12 items-center"
             style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12), transparent 60%)' }}>
          <div>
            <h2 className="text-3xl md:text-[34px] font-extrabold mb-4">{t('home.moneyScoreHeading')}</h2>
            <p className="text-gray-300 text-[17px] leading-relaxed max-w-[480px] mb-7">{t('home.moneyScoreDesc')}</p>
            <Link
              href="/money-score"
              onClick={() => trackCta('money_score_hero')}
              className="inline-block bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-4 rounded-xl text-base transition"
            >
              {t('home.moneyScoreCta')} &rarr;
            </Link>
          </div>
          <div className="flex flex-col items-center gap-3 shrink-0 mx-auto">
            <div
              className="w-[176px] h-[176px] rounded-full flex items-center justify-center"
              style={{ background: 'conic-gradient(#22c55e 0% 78%, rgba(255,255,255,0.08) 78% 100%)' }}
            >
              <div className="w-[138px] h-[138px] rounded-full bg-[#020617] flex flex-col items-center justify-center">
                <div className="text-[52px] leading-none font-extrabold">78</div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mt-1.5">{t('home.moneyScoreLabel')}</div>
              </div>
            </div>
            <div className="text-sm font-semibold text-green-400">{t('home.moneyScoreTrend')}</div>
          </div>
        </div>
      </section>

      {/* How It Works -- new section; the product's whole value prop in three steps */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24 md:py-28">
        <div className="text-center max-w-xl mx-auto mb-16">
          <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-3">{t('home.howItWorksEyebrow')}</div>
          <h2 className="text-3xl md:text-[42px] font-extrabold leading-tight">{t('home.howItWorksHeading')}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-10">
          {[
            { n: '01', title: t('home.step1Title'), desc: t('home.step1Desc') },
            { n: '02', title: t('home.step2Title'), desc: t('home.step2Desc') },
            { n: '03', title: t('home.step3Title'), desc: t('home.step3Desc') },
          ].map((s) => (
            <div key={s.n} className="text-center px-3">
              <div className="text-xs font-semibold text-gray-500 mb-3 tracking-wide">{s.n}</div>
              <h3 className="text-2xl font-extrabold mb-2">{s.title}</h3>
              <p className="text-gray-400 text-[15px] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product Showcase -- three large alternating sections, replacing the
          old flat 6-card feature grid as the primary "show, don't tell" beat.
          The six smaller feature cards still exist further down. */}
      <section className="max-w-6xl mx-auto px-6 py-24 md:py-28">
        <h2 className="text-3xl md:text-[42px] font-extrabold text-center mb-20">{t('home.showcaseHeading')}</h2>

        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-3">{t('home.showcase1Eyebrow')}</div>
            <h3 className="text-2xl md:text-[32px] font-extrabold mb-4">{t('home.showcase1Title')}</h3>
            <p className="text-gray-300 text-[17px] leading-relaxed max-w-[420px]">{t('home.showcase1Desc')}</p>
          </div>
          <div className="bg-[#0f172a] border border-gray-700 rounded-2xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
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

        <div className="grid md:grid-cols-2 gap-16 items-center mt-28">
          <div className="md:order-2">
            <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-3">{t('home.showcase2Eyebrow')}</div>
            <h3 className="text-2xl md:text-[32px] font-extrabold mb-4">{t('home.showcase2Title')}</h3>
            <p className="text-gray-300 text-[17px] leading-relaxed max-w-[420px]">{t('home.showcase2Desc')}</p>
          </div>
          <div className="md:order-1 bg-[#0f172a] border border-gray-700 rounded-2xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
            <div className="flex gap-5 text-xs text-gray-400 mb-4">
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Avalanche</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Snowball</span>
            </div>
            <svg width="100%" height="140" viewBox="0 0 400 140" preserveAspectRatio="none">
              <polyline points="0,15 60,32 120,52 180,75 240,98 300,118 360,130 400,136" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
              <polyline points="0,15 60,38 120,62 180,82 240,102 300,120 360,132 400,138" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
            </svg>
            {/* The emotional payoff ("7 months sooner") gets the visual
                weight here, not the factual line above it -- Vince's Aug 23
                2026 feedback: "you're selling answers, not data." */}
            <div className="text-xs text-gray-400 mt-5">Avalanche strategy debt-free date</div>
            <div className="text-2xl font-extrabold mt-0.5">March 2029</div>
            <div className="text-sm font-bold text-green-400 mt-1">7 months sooner than Snowball</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center mt-28">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-green-500 mb-3">{t('home.showcase3Eyebrow')}</div>
            <h3 className="text-2xl md:text-[32px] font-extrabold mb-4">{t('home.showcase3Title')}</h3>
            <p className="text-gray-300 text-[17px] leading-relaxed max-w-[420px]">{t('home.showcase3Desc')}</p>
          </div>
          <div className="bg-[#0f172a] border border-gray-700 rounded-2xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
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

      {/* Features Grid -- kept, demoted below the showcase per the redesign */}
      <section className="max-w-6xl mx-auto px-6 py-24 md:py-28">
        <h2 className="text-3xl md:text-[42px] font-extrabold text-center mb-3">{t('home.featuresHeading')}</h2>
        <p className="text-center text-gray-400 text-lg mb-14">{t('home.featuresSubheading')}</p>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="border border-gray-700 rounded-2xl p-7 hover:border-green-500 transition bg-[#0f172a]/50">
              <CheckCircle2 className="text-green-500 mb-3" size={24} />
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-[15px]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mobile App -- more prominent standalone section per the redesign;
          Footer.tsx also has a compact version of this (Google Play badge +
          QR code) that appears on every page -- left as-is for now. */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
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
          <div className="mx-auto w-[240px] h-[460px] rounded-[32px] border-[6px] border-gray-800 bg-[#0f172a] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 flex flex-col gap-3.5">
            <div className="w-14 h-1.5 rounded-full bg-gray-700 mx-auto mb-1" />
            <Smartphone className="text-green-500 mx-auto mb-1" size={22} />
            <div className="bg-white/5 rounded-lg px-3 py-2.5 text-[11px] text-gray-400">
              {t('home.dashLabel')}<b className="block text-white text-sm mt-0.5">$2,450.00</b>
            </div>
            <div className="bg-white/5 rounded-lg px-3 py-2.5 text-[11px] text-gray-400">
              {t('home.dashAvailable')}<b className="block text-white text-sm mt-0.5">$570.00</b>
            </div>
            <div className="bg-white/5 rounded-lg px-3 py-2.5 text-[11px] text-gray-400">
              {t('home.dashProgressLabel')}<b className="block text-white text-sm mt-0.5">68%</b>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-gray-800 py-24 md:py-28" style={{ background: 'linear-gradient(180deg, transparent, rgba(34,197,94,0.08))' }}>
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
