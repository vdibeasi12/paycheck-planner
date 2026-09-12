"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { hardSignOut } from "@/lib/signOut"

// Primary in-app destinations for a logged-in user.
const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/bills-debts", label: "Bills & Debts" },
  { href: "/goals", label: "Goals" },
  { href: "/insights", label: "Insights" },
  { href: "/ai-chat", label: "AI Chat" },
]

export default function AppNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // See lib/signOut.ts / app/auth/signout/route.ts (Aug 18 2026 fix) for why
  // this goes through a server-side route instead of calling
  // supabase.auth.signOut() + window.location.href directly here.
  const signOut = () => hardSignOut()

  const p = pathname || ""
  const isActive = (href: string) => p === href || p.startsWith(href + "/")

  // Logged-out visitors only see marketing links.
  if (!loggedIn) {
    // Tightened Sep 12 2026 alongside DisplaySettingsMenu. gap-6 plus px-6 on
    // the button was ~85px of padding in a row that was already running off
    // the right edge of a phone, taking "Log In" with it. whitespace-nowrap
    // matters too: without it the button is the first thing a cramped flex row
    // decides to wrap mid-word.
    return (
      <div className="flex items-center gap-3 sm:gap-6">
        <Link
          href="/pricing"
          className="text-secondary hover:text-primary transition text-sm font-medium whitespace-nowrap"
        >
          Pricing
        </Link>
        <Link
          href="/login"
          className="bg-green-500 hover:bg-green-600 text-black font-semibold px-4 sm:px-6 py-2 rounded text-sm transition whitespace-nowrap"
        >
          Login
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex gap-6 items-center">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-base font-semibold transition ${
              isActive(l.href) ? "text-green-400" : "text-secondary hover:text-primary"
            }`}
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/account"
          className={`text-base font-semibold transition ${
            isActive("/account") ? "text-green-400" : "text-secondary hover:text-primary"
          }`}
        >
          Account
        </Link>
        <button
          onClick={signOut}
          className="text-base font-semibold text-secondary hover:text-primary transition"
        >
          Sign out
        </button>
      </nav>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="md:hidden text-secondary p-2 -mr-2"
        aria-label="Menu"
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile dropdown panel (anchored under the sticky header) */}
      {open && (
        <div className="md:hidden absolute left-0 right-0 top-full bg-surface border-b border-default shadow-lg">
          <div className="flex flex-col px-6 py-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`py-3 text-base font-medium border-b border-subtle/60 ${
                  isActive(l.href) ? "text-green-400" : "text-secondary"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className={`py-3 text-base font-medium border-b border-subtle/60 ${
                isActive("/account") ? "text-green-400" : "text-secondary"
              }`}
            >
              Account
            </Link>
            <button
              onClick={() => {
                setOpen(false)
                signOut()
              }}
              className="py-3 text-left text-base font-medium text-muted"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  )
}
