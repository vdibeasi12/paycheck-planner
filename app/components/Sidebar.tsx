"use client"

import { Fragment, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Menu,
  X,
  LayoutDashboard,
  CreditCard,
  CalendarClock,
  Calendar,
  Receipt,
  Wallet,
  Target,
  Trophy,
  BarChart3,
  Gauge,
  GraduationCap,
  Calculator,
  Rocket,
  BookOpen,
  MessageSquare,
  MessageSquarePlus,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Settings,
  LogOut,
} from "lucide-react"
import Logo from "./Logo"
import GettingStartedModal from "./GettingStartedModal"
import ProductTour from "./ProductTour"
import CalendarPeek from "./CalendarPeek"
import LocaleCurrencySelector from "./LocaleCurrencySelector"
import { useLocale } from "@/lib/i18n/LocaleProvider"
import { supabase } from "@/lib/supabase/client"

const LINKS = [
  { href: "/dashboard", labelKey: "nav.dashboard", Icon: LayoutDashboard },
  { href: "/calendar", labelKey: "nav.calendar", Icon: Calendar },
  { href: "/debts", labelKey: "nav.debts", Icon: CreditCard },
  { href: "/amortization", labelKey: "nav.payoffPlan", Icon: CalendarClock },
  { href: "/bills", labelKey: "nav.bills", Icon: Receipt },
  { href: "/income", labelKey: "nav.income", Icon: Wallet },
  { href: "/goals", labelKey: "nav.goals", Icon: Target },
  { href: "/achievements", labelKey: "nav.achievements", Icon: Trophy },
  { href: "/insights", labelKey: "nav.insights", Icon: BarChart3 },
  { href: "/money-score", labelKey: "nav.moneyScore", Icon: Gauge },
  { href: "/university", labelKey: "nav.university", Icon: GraduationCap },
  { href: "/calculators", labelKey: "nav.calculators", Icon: Calculator },
  { href: "/challenge", labelKey: "nav.challenge", Icon: Rocket },
  { href: "/blog", labelKey: "nav.financialHub", Icon: BookOpen },
  { href: "/ai-chat", labelKey: "nav.aiChat", Icon: MessageSquare },
  { href: "/account", labelKey: "nav.account", Icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [gsOpen, setGsOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mfaReminder, setMfaReminder] = useState(false)

  // The MFA gate pages are full-screen, blocking interstitials the user must
  // complete before touching the rest of the app. No nav chrome and no
  // onboarding modal should ever render on top of them.
  const onMfaGate = (pathname || "").startsWith("/mfa")

  // Show the Admin link only to admin accounts.
  useEffect(() => {
    if (onMfaGate) return
    let active = true
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user
      if (!user) return
      const { data: prof } = await supabase
        .from("profiles")
        .select("is_admin, onboarded")
        .eq("id", user.id)
        .single()
      if (!active) return
      if (prof?.is_admin) setIsAdmin(true)
      // First-run: open the tier-aware checklist for users who haven't finished setup.
      if (prof?.onboarded === false) setGsOpen(true)

      // Non-blocking login reminder for existing users who skipped MFA setup.
      // Purely a nudge -- MFA stays optional everywhere except the Autopilot
      // bank-connect flow (already enforced separately in PlaidConnectButton).
      // Shown once per browser session so it doesn't nag on every page nav.
      if (prof?.onboarded !== false) {
        try {
          const dismissed = window.sessionStorage.getItem("pp_mfa_reminder_dismissed")
          if (!dismissed) {
            const { data: factors } = await supabase.auth.mfa.listFactors()
            const hasVerified =
              !!factors &&
              Array.isArray(factors.all) &&
              factors.all.some((f) => f.status === "verified")
            if (active && !hasVerified) setMfaReminder(true)
          }
        } catch {
          // Non-critical -- skip the reminder on any error.
        }
      }
    })
    return () => {
      active = false
    }
  }, [onMfaGate])

  const dismissMfaReminder = () => {
    try {
      window.sessionStorage.setItem("pp_mfa_reminder_dismissed", "1")
    } catch {
      // Ignore -- worst case the reminder reappears on next nav this session.
    }
    setMfaReminder(false)
  }

  if (onMfaGate) return null

  const p = pathname || ""
  const isActive = (href: string) => p === href || p.startsWith(href + "/")

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const openFeedback = (onNavigate?: () => void) => {
    onNavigate?.()
    window.dispatchEvent(new CustomEvent("open-feedback"))
  }

  const renderLinks = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-1 px-3">
      {LINKS.map(({ href, labelKey, Icon }) => {
        const active = isActive(href)
        return (
          <Fragment key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              data-tour={"nav-" + href.replace(/\//g, "")}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition ${
                active
                  ? "bg-green-500/15 text-green-400"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={20} className={active ? "text-green-400" : "text-gray-400"} />
              {t(labelKey)}
            </Link>

            {href === "/dashboard" && (
              <button
                onClick={() => {
                  onNavigate?.()
                  setGsOpen(true)
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-medium text-gray-300 transition hover:bg-white/5 hover:text-white"
              >
                <Sparkles size={20} className="text-gray-400" />
                {t("nav.gettingStarted")}
              </button>
            )}
          </Fragment>
        )
      })}

      {isAdmin && (
        <Link
          href="/admin"
          onClick={onNavigate}
          aria-current={isActive("/admin") ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition ${
            isActive("/admin")
              ? "bg-green-500/15 text-green-400"
              : "text-gray-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <ShieldCheck
            size={20}
            className={isActive("/admin") ? "text-green-400" : "text-gray-400"}
          />
          {t("nav.admin")}
        </Link>
      )}

      <div className="my-1 border-t border-gray-800" />

      <CalendarPeek onNavigate={onNavigate} />

      <button
        onClick={() => openFeedback(onNavigate)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-medium text-gray-300 transition hover:bg-white/5 hover:text-white"
      >
        <MessageSquarePlus size={20} className="text-gray-400" />
        {t("nav.feedback")}
      </button>

      <button
        onClick={() => {
          onNavigate?.()
          signOut()
        }}
        className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
      >
        <LogOut size={20} className="text-gray-500" />
        {t("nav.signOut")}
      </button>
    </nav>
  )

  return (
    <>
      {/* Mobile top bar (only when the desktop sidebar is hidden) */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-800 bg-[#020617]/95 px-4 py-3 backdrop-blur pt-[calc(env(safe-area-inset-top)+0.75rem)] md:hidden">
        <Link href="/dashboard" className="flex items-center" aria-label="Paycheck Planner home">
          <Logo size="md" />
        </Link>
        <div className="flex items-center gap-2">
          <LocaleCurrencySelector inline />
          <button
            onClick={() => setOpen(true)}
            className="-mr-2 p-2 text-gray-200"
            aria-label="Open menu"
          >
            <Menu size={26} />
          </button>
        </div>
      </header>

      {/* Top-right language/currency widget (desktop only) */}
      <div className="fixed top-4 right-4 z-50 hidden rounded-lg border border-gray-800 bg-[#0b1220]/95 px-2.5 py-2 shadow-lg backdrop-blur md:block">
        <LocaleCurrencySelector inline />
      </div>

      {/* Desktop fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gray-800 bg-[#0b1220] md:flex">
        <div className="flex items-center border-b border-gray-800 px-6 py-5">
          <Link
            href="/dashboard"
            className="flex items-center transition hover:opacity-80"
            aria-label="Paycheck Planner home"
          >
            <Logo size="md" />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          {renderLinks()}
        </div>
      </aside>

      {/* Mobile slide-out drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col border-r border-gray-800 bg-[#0b1220] shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
              <Logo size="md" />
              <button
                onClick={() => setOpen(false)}
                className="-mr-2 p-2 text-gray-300"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              {renderLinks(() => setOpen(false))}
            </div>
          </aside>
        </div>
      )}

      {/* Login-time MFA reminder -- dismissible nudge, never blocks navigation.
          Suppressed while the Getting Started checklist is open since that
          already surfaces the same "Secure your account" step. */}
      {mfaReminder && !gsOpen && (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-xl border border-amber-500/30 bg-[#0f172a] p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Secure your account</p>
              <p className="mt-1 text-xs text-gray-400">
                Add two-factor authentication to protect your financial data. Takes about a
                minute.
              </p>
              <Link
                href="/mfa/setup"
                onClick={dismissMfaReminder}
                className="mt-2 inline-block text-xs font-semibold text-emerald-400 hover:underline"
              >
                Set up now →
              </Link>
            </div>
            <button
              onClick={dismissMfaReminder}
              aria-label="Dismiss"
              className="shrink-0 rounded p-0.5 text-gray-500 hover:text-gray-300"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <GettingStartedModal open={gsOpen} onClose={() => setGsOpen(false)} />
      <ProductTour />
    </>
  )
}
