'use client'

import Link from 'next/link'
import { CheckCircle2, TrendingDown, Brain, Zap } from 'lucide-react'
import MemberMilestone from './components/MemberMilestone'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { trackCta } from '@/lib/trackClient'

export default function HomePage() {
  const { t } = useLocale()

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