"use client"

import { useLocale } from "@/lib/i18n/LocaleProvider"

export default function FeaturesPage() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-4">{t("features.title")}</h1>
        <p className="text-gray-300 text-lg mb-12">
          {t("features.subtitle")}
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Feature 1 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">ðŸ“Š</div>
            <h2 className="text-2xl font-bold mb-3">{t("features.f1Title")}</h2>
            <p className="text-gray-300 mb-4">
              {t("features.f1Desc")}
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>âœ“ {t("features.f1B1")}</li>
              <li>âœ“ {t("features.f1B2")}</li>
              <li>âœ“ {t("features.f1B3")}</li>
              <li>âœ“ {t("features.f1B4")}</li>
            </ul>
          </div>

          {/* Feature 2 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">ðŸ“¸</div>
            <h2 className="text-2xl font-bold mb-3">{t("features.f2Title")}</h2>
            <p className="text-gray-300 mb-4">
              {t("features.f2Desc")}
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>âœ“ {t("features.f2B1")}</li>
              <li>âœ“ {t("features.f2B2")}</li>
              <li>âœ“ {t("features.f2B3")}</li>
              <li>âœ“ {t("features.f2B4")}</li>
            </ul>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">ðŸ“ˆ</div>
            <h2 className="text-2xl font-bold mb-3">{t("features.f3Title")}</h2>
            <p className="text-gray-300 mb-4">
              {t("features.f3Desc")}
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>âœ“ {t("features.f3B1")}</li>
              <li>âœ“ {t("features.f3B2")}</li>
              <li>âœ“ {t("features.f3B3")}</li>
              <li>âœ“ {t("features.f3B4")}</li>
            </ul>
          </div>

          {/* Feature 4 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">ðŸ¤–</div>
            <h2 className="text-2xl font-bold mb-3">{t("features.f4Title")}</h2>
            <p className="text-gray-300 mb-4">
              {t("features.f4Desc")}
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>âœ“ {t("features.f4B1")}</li>
              <li>âœ“ {t("features.f4B2")}</li>
              <li>âœ“ {t("features.f4B3")}</li>
              <li>âœ“ {t("features.f4B4")}</li>
            </ul>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-8 mb-12">
          <h2 className="text-3xl font-bold mb-8">{t("features.whyChoose")}</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold text-green-400 mb-3">{t("features.fastSetupTitle")}</h3>
              <p className="text-gray-300">
                {t("features.fastSetupDesc")}
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-blue-400 mb-3">{t("features.secureTitle")}</h3>
              <p className="text-gray-300">
                {t("features.secureDesc")}
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-purple-400 mb-3">{t("features.availableTitle")}</h3>
              <p className="text-gray-300">
                {t("features.availableDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-[#0f172a] border border-gray-700 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">{t("features.ctaTitle")}</h2>
          <p className="text-gray-300 mb-6">
            {t("features.ctaSubtitle")}
          </p>
          
            href="/pricing"
            className="inline-block bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg transition"
          >
            {t("features.ctaButton")}
          </a>
        </div>
      </div>
    </div>
  )
}
