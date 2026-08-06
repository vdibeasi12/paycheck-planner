"use client"

import { Globe, Coins } from "lucide-react"
import { useLocale } from "@/lib/i18n/LocaleProvider"
import { LOCALES, CURRENCIES, type LocaleCode, type CurrencyCode } from "@/lib/i18n/config"

export default function LocaleCurrencySelector({
  compact = false,
  inline = false,
}: {
  compact?: boolean
  inline?: boolean
}) {
  const { locale, currency, setLocale, setCurrency, t } = useLocale()

  if (inline) {
    return (
      <div className="flex items-center gap-1.5">
        <label className="flex items-center gap-1" aria-label={t("selector.language")}>
          <Globe size={14} className="text-gray-400 shrink-0" />
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as LocaleCode)}
            className="w-[84px] rounded-md border border-gray-700 bg-[#0b1220] px-1.5 py-1 text-xs text-gray-200 focus:border-green-500 focus:outline-none sm:w-auto"
          >
            {Object.entries(LOCALES).map(([code, entry]) => (
              <option key={code} value={code}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1" aria-label={t("selector.currency")}>
          <Coins size={14} className="text-gray-400 shrink-0" />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="w-[64px] rounded-md border border-gray-700 bg-[#0b1220] px-1.5 py-1 text-xs text-gray-200 focus:border-green-500 focus:outline-none sm:w-auto"
          >
            {Object.entries(CURRENCIES).map(([code, entry]) => (
              <option key={code} value={code}>
                {entry.symbol} {code}
              </option>
            ))}
          </select>
        </label>
      </div>
    )
  }

  return (
    <div className={`flex ${compact ? "flex-row gap-2" : "flex-col gap-2"} px-3 pb-3`}>
      <label className="flex flex-1 flex-col gap-1 text-[11px] uppercase tracking-wide text-gray-500">
        {t("selector.language")}
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as LocaleCode)}
          className="rounded-md border border-gray-800 bg-[#0b1220] px-2 py-1.5 text-sm text-gray-200 focus:border-green-500 focus:outline-none"
        >
          {Object.entries(LOCALES).map(([code, entry]) => (
            <option key={code} value={code}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-1 flex-col gap-1 text-[11px] uppercase tracking-wide text-gray-500">
        {t("selector.currency")}
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
          className="rounded-md border border-gray-800 bg-[#0b1220] px-2 py-1.5 text-sm text-gray-200 focus:border-green-500 focus:outline-none"
        >
          {Object.entries(CURRENCIES).map(([code, entry]) => (
            <option key={code} value={code}>
              {entry.symbol} {code}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
