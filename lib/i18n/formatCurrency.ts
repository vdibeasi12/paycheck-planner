import { useLocale } from "./LocaleProvider"

export function formatCurrency(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount)
  } catch {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }
}

export function useFormatCurrency() {
  const { currency, locale } = useLocale()
  return (amount: number) => formatCurrency(amount, currency, locale)
}
