"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  LOCALES,
  CURRENCIES,
  DEFAULT_LOCALE,
  type LocaleCode,
  type CurrencyCode,
} from "./config"
import enMessages from "./messages/en.json"
import { supabase } from "@/lib/supabase/client"

type Messages = Record<string, any>

const messageLoaders: Record<string, () => Promise<{ default: Messages }>> = {
  en: () => import("./messages/en.json"),
  es: () => import("./messages/es.json"),
  fr: () => import("./messages/fr.json"),
  de: () => import("./messages/de.json"),
  it: () => import("./messages/it.json"),
  pl: () => import("./messages/pl.json"),
  is: () => import("./messages/is.json"),
}

const LOCALE_STORAGE_KEY = "pp_locale"
const CURRENCY_STORAGE_KEY = "pp_currency"

interface LocaleContextValue {
  locale: LocaleCode
  currency: CurrencyCode
  setLocale: (locale: LocaleCode) => void
  setCurrency: (currency: CurrencyCode) => void
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
  children,
  initialLocale,
  initialCurrency,
}: {
  children: ReactNode
  initialLocale?: LocaleCode
  initialCurrency?: CurrencyCode
}) {
  const startLocale = initialLocale && LOCALES[initialLocale] ? initialLocale : DEFAULT_LOCALE
  const [locale, setLocaleState] = useState<LocaleCode>(startLocale)
  const [currency, setCurrencyState] = useState<CurrencyCode>(
    initialCurrency && CURRENCIES[initialCurrency]
      ? initialCurrency
      : LOCALES[startLocale].defaultCurrency
  )
  const [messages, setMessages] = useState<Messages>(enMessages)

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY) as LocaleCode | null
    const storedCurrency = window.localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode | null
    if (!initialLocale && storedLocale && LOCALES[storedLocale]) setLocaleState(storedLocale)
    if (!initialCurrency && storedCurrency && CURRENCIES[storedCurrency]) setCurrencyState(storedCurrency)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const entry = LOCALES[locale]
    if (!entry || entry.languageFile === "en") {
      setMessages(enMessages)
      return
    }
    let active = true
    messageLoaders[entry.languageFile]?.().then((mod) => {
      if (active) setMessages(mod.default)
    })
    return () => {
      active = false
    }
  }, [locale])

  const persist = useCallback(async (nextLocale: LocaleCode, nextCurrency: CurrencyCode) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale)
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, nextCurrency)
    document.cookie = `pp_locale=${nextLocale}; path=/; max-age=31536000`
    document.cookie = `pp_currency=${nextCurrency}; path=/; max-age=31536000`

    const { data } = await supabase.auth.getUser()
    if (data?.user) {
      await supabase
        .from("profiles")
        .update({ locale: nextLocale, display_currency: nextCurrency })
        .eq("id", data.user.id)
    }
  }, [])

  const setLocale = useCallback(
    (next: LocaleCode) => {
      setLocaleState(next)
      const userHasCustomCurrency = !!window.localStorage.getItem(CURRENCY_STORAGE_KEY)
      const nextCurrency = userHasCustomCurrency ? currency : LOCALES[next].defaultCurrency
      if (!userHasCustomCurrency) setCurrencyState(nextCurrency)
      persist(next, nextCurrency)
    },
    [currency, persist]
  )

  const setCurrency = useCallback(
    (next: CurrencyCode) => {
      setCurrencyState(next)
      persist(locale, next)
    },
    [locale, persist]
  )

  const t = useCallback(
    (key: string): string => {
      const lookup = (source: Messages) =>
        key
          .split(".")
          .reduce<any>((acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined), source)
      return lookup(messages) ?? lookup(enMessages) ?? key
    },
    [messages]
  )

  return (
    <LocaleContext.Provider value={{ locale, currency, setLocale, setCurrency, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider")
  return ctx
}
