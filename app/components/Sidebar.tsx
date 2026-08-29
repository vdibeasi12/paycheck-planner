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
  PieChart,
  Gauge,
  GraduationCap,
  BookOpen,
  MessageSquare,
  MessageSquarePlus,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Wand2,
  GitCompare,
  Settings,
  LogOut,
  LifeBuoy,
} from "lucide-react"
import Logo from "./Logo"
import GettingStartedModal from "./GettingStartedModal"
import ProductTour from "./ProductTour"
import LocaleCurrencySelector from "./LocaleCurrencySelector"
import { useLocale } from "@/lib/i18n/LocaleProvider"
import { supabase } from "@/lib/supabase/client"
import { hardSignOut } from "@/lib/signOut"

// Grouped + ordered by how often a typical user actually opens each page --
// Money first (checked every visit or close to it), then Grow (progress /
// gamification, checked periodically), Reports (deeper breakdowns, occasional
// check-ins), Learn (educational content, visited occasionally), then two
// ungrouped utility links that don't fit a content category. `group` is only
// set on the first item of each cluster -- renderLinks() below reads it to
// print a small section header there.
const LINKS = [
  { href: "/dashboard", labelKey: "nav.dashboard", Icon: LayoutDashboard, group: "money" },
  { href: "/survival-mode", labelKey: "nav.survivalMode", Icon: LifeBuoy },
  { href: "/bills", labelKey: "nav.bills", Icon: Receipt },
  { href: "/debts", labelKey: "nav.debts", Icon: CreditCard },
  { href: "/calendar", labelKey: "nav.calendar", Icon: Calendar },
  { href: "/income", labelKey: "nav.income", Icon: Wallet },
  { href: "/amortization", labelKey: "nav.payoffPlan", Icon: CalendarClock },

  { href: "/paycheck-shield", labelKey: "nav.paycheckShield", Icon: Shield, group: "grow" },
  { href: "/paycheck-autopilot", labelKey: "nav.paycheckAutopilot", Icon: Wand2 },
  { href: "/plan-drift", labelKey: "nav.planDrift", Icon: GitCompare },
  { href: "/goals", labelKey: "nav.goals", Icon: Target },
  { href: "/achievements", labelKey: "nav.achievements", Icon: Trophy },
  { href: "/money-score", labelKey: "nav.moneyScore", Icon: Gauge },

  // Report was collapsed into a "Download PDF summary" action on the Payoff
  // Plan page (/amortization) -- no separate Report link/page anymore.
  { href: "/insights", labelKey: "nav.insights", Icon: BarChart3, group: "reports" },
  { href: "/analytics", labelKey: "nav.analytics", Icon: PieChart },

  // Calculators and the 30-Day Challenge are deliberately not linked here --
  // Financial Hub already surfaces both as cards, and duplicating them in
  // the sidebar just adds clutter. Reach them via Financial Hub instead.
  { href: "/blog", labelKey: "nav.financialHub", Icon: BookOpen, group: "learn" },
  { href: "/university", labelKey: "nav.university", Icon: GraduationCap },

  { href: "/ai-chat", labelKey: "nav.aiChat", Icon: MessageSquare },
]

const GROUP_LABEL_KEYS: Record<string, string> = {
  money: "nav.groupMoney",
  grow: "nav.groupGrow",
  reports: "nav.groupReports",
  learn: "nav.groupLearn",
}

export default function Sidebar() {
  const pathname = usePathname()
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [gsOpen, setGsOpen] = useState(false)
  // True only when the checklist auto-opened itself for a still-onboarding
  // user (see the effect below) -- distinguishes that from someone
  // reopening it later via the nav button, so GettingStartedModal knows
  // whether to show the trimmed first-run checklist or the full one.
  const [gsFirstRun, setGsFirstRun] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mfaReminder, setMfaReminder] = useState(false)

  // The MFA gate pages are full-screen, blocking interstitials the user must
  // complete before touching the rest of the app -- no nav chrome or
  // onboarding modal should ever render on top of them. This used to be
  // enforced here via a pathname check, but that could disagree with the
  // root layout's own (AAL-status-based) decision of whether to mount this
  // component at all, which caused /mfa/setup to render off-center for
  // not-yet-enrolled users (QA fix, Aug 15 2026). app/layout.tsx is now the
  // single source of truth: it doesn't mount <Sidebar /> at all on /mfa
  // routes (via the x-pathname header set in middleware.ts), so this
  // component no longer needs its own pathname gate.

  // Show the Admin link only to admin accounts.
  useEffect(() => {
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
      if (prof?.onboarded === false) {
        setGsFirstRun(true)
        setGsOpen(true)
      }

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
  }, [])

  const dismissMfaReminder = () => {
    try {
      window.sessionStorage.setItem("pp_mfa_reminder_dismissed", "1")
    } catch {
      // Ignore -- worst case the reminder reappears on next nav this session.
    }
    setMfaReminder(false)
  }

  const p = pathname || ""
  const isActive = (href: string) => p === href || p.startsWith(href + "/")

  // See lib/signOut.ts / app/auth/signout/route.ts (Aug 18 2026 fix) for why
  // this goes through a server-side route instead of calling
  // supabase.auth.signOut() + window.location.href directly here.
  const signOut = () => hardSignOut()

  const openFeedback = (onNavigate?: () => void) => {
    onNavigate?.()
    window.dispatchEvent(new CustomEvent("open-feedback"))
  }

  const renderLinks = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-1 px-3">
      {/* Account + Sign out moved out of this list entirely and up next to
          the language/currency widget at the top of the screen (Vince, Aug
          27 2026) -- see the fixed top-right widget (desktop) and mobile
          top bar below. Account is where people manage their payment plan,
          so it needed to be somewhere always visible, not just reachable
          by scrolling this nav (it used to be the last item in LINKS, with
          Sign out dead last after the divider). */}
      {/* Getting Started sits above Dashboard (Vince, Aug 27 2026) -- it's
          the first thing a still-onboarding user should see, and previously
          it rendered directly under the Dashboard link where it read as a
          Dashboard sub-item rather than its own top-level entry. */}
      <button
        onClick={() => {
          onNavigate?.()
          setGsFirstRun(false)
          setGsOpen(true)
        }}
        data-tour="nav-getting-started"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-medium text-gray-300 transition hover:bg-white/5 hover:text-white"
      >
        <Sparkles size={20} className="text-gray-400" />
        {t("nav.gettingStarted")}
      </button>

      {LINKS.map(({ href, labelKey, Icon, group }) => {
        const active = isActive(href)
        return (
          <Fragment key={href}>
            {group && (
              <div className="mt-3 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 first:mt-0">
                {t(GROUP_LABEL_KEYS[group])}
              </div>
            )}
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

      {/* "Upcoming (30 days)" used to be a separate drawer trigger here --
          it now lives as an always-visible side panel on the Calendar page
          itself, next to the month grid, so Calendar is a single link. */}

      <button
        onClick={() => openFeedback(onNavigate)}
        data-tour="nav-feedback"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-medium text-gray-300 transition hover:bg-white/5 hover:text-white"
      >
        <MessageSquarePlus size={20} className="text-gray-400" />
        {t("nav.feedback")}
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
        <div className="flex items-center gap-1.5">
          <LocaleCurrencySelector inline />
          {/* Account + Sign out live right next to the language/currency
              selector (Vince, Aug 27 2026) -- always visible up top instead
              of buried in the nav list below. */}
          <Link
            href="/account"
            data-tour="nav-account"
            aria-label={t("nav.account")}
            title={t("nav.account")}
            aria-current={isActive("/account") ? "page" : undefined}
            className={`rounded-lg p-2 transition ${
              isActive("/account") ? "text-green-400" : "text-gray-200 hover:text-white"
            }`}
          >
            <Settings size={22} />
          </Link>
          <button
            onClick={signOut}
            data-tour="nav-sign-out"
            aria-label={t("nav.signOut")}
            title={t("nav.signOut")}
            className="rounded-lg p-2 text-gray-200 transition hover:text-white"
          >
            <LogOut size={22} />
          </button>
          <button
            onClick={() => setOpen(true)}
            className="-mr-2 p-2 text-gray-200"
            aria-label="Open menu"
          >
            <Menu size={26} />
          </button>
        </div>
      </header>

      {/* Top-right widget (desktop only): language/currency selector plus
          Account + Sign out (Vince, Aug 27 2026) -- Account is where people
          manage their payment plan, so it lives somewhere always visible at
          the top of the screen rather than requiring a scroll down the
          sidebar's nav list. */}
      <div className="fixed top-4 right-4 z-50 hidden items-center gap-2 md:flex">
        <div className="rounded-lg border border-gray-800 bg-[#0b1220]/95 px-2.5 py-2 shadow-lg backdrop-blur">
          <LocaleCurrencySelector inline />
        </div>
        <Link
          href="/account"
          data-tour="nav-account"
          aria-label={t("nav.account")}
          title={t("nav.account")}
          aria-current={isActive("/account") ? "page" : undefined}
          className={`flex items-center justify-center rounded-lg border border-gray-800 bg-[#0b1220]/95 p-2.5 shadow-lg backdrop-blur transition hover:bg-white/5 ${
            isActive("/account") ? "text-green-400" : "text-gray-300 hover:text-white"
          }`}
        >
          <Settings size={18} />
        </Link>
        <button
          onClick={signOut}
          data-tour="nav-sign-out"
          aria-label={t("nav.signOut")}
          title={t("nav.signOut")}
          className="flex items-center justify-center rounded-lg border border-gray-800 bg-[#0b1220]/95 p-2.5 text-gray-300 shadow-lg backdrop-blur transition hover:bg-white/5 hover:text-white"
        >
          <LogOut size={18} />
        </button>
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

      <GettingStartedModal
        open={gsOpen}
        firstRun={gsFirstRun}
        onClose={() => setGsOpen(false)}
      />
      <ProductTour />
    </>
  )
}
