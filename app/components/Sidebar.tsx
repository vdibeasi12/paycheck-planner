"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Menu,
  X,
  LayoutDashboard,
  CreditCard,
  CalendarClock,
  Receipt,
  Wallet,
  Target,
  Trophy,
  BarChart3,
  MessageSquare,
  MessageSquarePlus,
  Sparkles,
  Settings,
  LogOut,
} from "lucide-react"
import Logo from "./Logo"
import GettingStartedModal from "./GettingStartedModal"
import { supabase } from "@/lib/supabase/client"

const LINKS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/debts", label: "Debts", Icon: CreditCard },
  { href: "/amortization", label: "Payoff Plan", Icon: CalendarClock },
  { href: "/bills", label: "Bills", Icon: Receipt },
  { href: "/income", label: "Income", Icon: Wallet },
  { href: "/goals", label: "Goals", Icon: Target },
  { href: "/achievements", label: "Achievements", Icon: Trophy },
  { href: "/insights", label: "Insights", Icon: BarChart3 },
  { href: "/ai-chat", label: "AI Chat", Icon: MessageSquare },
  { href: "/account", label: "Account", Icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [gsOpen, setGsOpen] = useState(false)

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
      {LINKS.map(({ href, label, Icon }) => {
        const active = isActive(href)
        return (
          <Fragment key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition ${
                active
                  ? "bg-green-500/15 text-green-400"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={20} className={active ? "text-green-400" : "text-gray-400"} />
              {label}
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
                Getting Started
              </button>
            )}
          </Fragment>
        )
      })}

      <button
        onClick={() => openFeedback(onNavigate)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-medium text-gray-300 transition hover:bg-white/5 hover:text-white"
      >
        <MessageSquarePlus size={20} className="text-gray-400" />
        Feedback
      </button>

      <button
        onClick={() => {
          onNavigate?.()
          signOut()
        }}
        className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
      >
        <LogOut size={20} className="text-gray-500" />
        Sign out
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
        <button
          onClick={() => setOpen(true)}
          className="-mr-2 p-2 text-gray-200"
          aria-label="Open menu"
        >
          <Menu size={26} />
        </button>
      </header>

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

      <GettingStartedModal open={gsOpen} onClose={() => setGsOpen(false)} />
    </>
  )
}