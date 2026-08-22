'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, TrendingDown, Brain, Zap } from 'lucide-react'
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

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              {t('home.heroPrefix')}<span className="text-green-500">{t('home.heroHighlight')}</span>{t('home.heroSuffix')}
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              {t('home.heroSubtitle')}
            </p>
            <div className="flex gap-4">
              <Link
                href="/signup"
                onClick={() => trackCta('get_started_hero')}
                className="bg-green-500 hover:bg-green-600 text-black font-semibold px-8 py-3 rounded-lg text-lg transition"
              >
                {t('home.ctaStartFree')}
              </Link>
              <Link
                href="/pricing"
                onClick={() => trackCta('view_plans_hero')}
                className="border border-green-500 text-green-500 hover:bg-green-500/10 font-semibold px-8 py-3 rounded-lg text-lg transition"
              >
                {t('home.ctaViewPlans')}
              </Link>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-2xl p-8 border border-gray-700">
            <div className="space-y-6">
              <div className="flex gap-4">
                <TrendingDown className="text-green-500 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold text-lg">{t('home.statPayoffTitle')}</h3>
                  <p className="text-gray-300">{t('home.statPayoffDesc')}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Brain className="text-blue-500 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold text-lg">{t('home.statAiTitle')}</h3>
                  <p className="text-gray-300">{t('home.statAiDesc')}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Zap className="text-yellow-500 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold text-lg">{t('home.statInsightsTitle')}</h3>
                  <p className="text-gray-300">{t('home.statInsightsDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof / milestone */}
      <MemberMilestone />

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-12">{t('home.featuresHeading')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="border border-gray-700 rounded-lg p-6 hover:border-green-500 transition bg-[#0f172a]/50">
              <CheckCircle2 className="text-green-500 mb-3" size={24} />
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Money Quiz banner -- the low-commitment entry point for someone who
          isn't ready to sign up yet (e.g. arriving from a YouTube video):
          answer 10 questions, get a score, no account required. */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-10 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wide mb-2">
              {t('home.moneyQuizEyebrow')}
            </p>
            <h2 className="text-3xl font-bold mb-3">{t('home.moneyQuizTitle')}</h2>
            <p className="text-gray-300 max-w-xl">{t('home.moneyQuizDesc')}</p>
          </div>
          <Link
            href="/money-score"
            onClick={() => trackCta('money_quiz_banner')}
            className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-8 py-4 rounded-lg text-lg transition whitespace-nowrap"
          >
            {t('home.moneyQuizCta')}
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-y border-gray-700 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">{t('home.ctaHeading')}</h2>
          <p className="text-xl text-gray-300 mb-8">
            {t('home.ctaSubtitle')}
          </p>
          <Link
            href="/signup"
            onClick={() => trackCta('get_started_bottom')}
            className="inline-block bg-green-500 hover:bg-green-600 text-black font-semibold px-8 py-4 rounded-lg text-lg transition"
          >
            {t('home.ctaButton')}
          </Link>
        </div>
      </section>
    </main>
  )
}
