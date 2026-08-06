export type LocaleCode =
  | "en-US"
  | "en-GB"
  | "en-AU"
  | "es-MX"
  | "es-ES"
  | "fr-FR"
  | "de-DE"
  | "it-IT"
  | "pl-PL"
  | "is-IS"

export type CurrencyCode = "USD" | "GBP" | "AUD" | "MXN" | "EUR" | "PLN" | "ISK"

export type LanguageFile = "en" | "es" | "fr" | "de" | "it" | "pl" | "is"

export const DEFAULT_LOCALE: LocaleCode = "en-US"

export const LOCALES: Record<
  LocaleCode,
  { label: string; languageFile: LanguageFile; defaultCurrency: CurrencyCode }
> = {
  "en-US": { label: "English (US)", languageFile: "en", defaultCurrency: "USD" },
  "en-GB": { label: "English (UK)", languageFile: "en", defaultCurrency: "GBP" },
  "en-AU": { label: "English (Australia)", languageFile: "en", defaultCurrency: "AUD" },
  "es-MX": { label: "Español (México)", languageFile: "es", defaultCurrency: "MXN" },
  "es-ES": { label: "Español (España)", languageFile: "es", defaultCurrency: "EUR" },
  "fr-FR": { label: "Français", languageFile: "fr", defaultCurrency: "EUR" },
  "de-DE": { label: "Deutsch", languageFile: "de", defaultCurrency: "EUR" },
  "it-IT": { label: "Italiano", languageFile: "it", defaultCurrency: "EUR" },
  "pl-PL": { label: "Polski", languageFile: "pl", defaultCurrency: "PLN" },
  "is-IS": { label: "Íslenska", languageFile: "is", defaultCurrency: "ISK" },
}

export const CURRENCIES: Record<CurrencyCode, { label: string; symbol: string }> = {
  USD: { label: "US Dollar", symbol: "$" },
  GBP: { label: "British Pound", symbol: "£" },
  AUD: { label: "Australian Dollar", symbol: "A$" },
  MXN: { label: "Mexican Peso", symbol: "MX$" },
  EUR: { label: "Euro", symbol: "€" },
  PLN: { label: "Polish Złoty", symbol: "zł" },
  ISK: { label: "Icelandic Króna", symbol: "kr" },
}
