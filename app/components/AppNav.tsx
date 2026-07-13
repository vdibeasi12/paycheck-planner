"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

// Primary in-app destinations for a logged-in user.
const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/debts", label: "Debts" },
  { href: "/bills", label: "Bills" },
  { href: "/goals", label: "Goals" },
  { href: "/insights", label: "Insights" },
  { href: "/ai-chat", label: "AI Chat" },
]

export default function AppNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const p = pathname || ""
  const isActive = (href: string) => p === href || p.startsWith(href + "/")

  // Logged-out visitors only see marketing links.
  if (!loggedIn) {
    return (
      <div className="flex gap-6 items-center">
        <Link
          href="/pricing"
          className="text-gray-100 hover:text-white transition text-sm font-medium"
        >
          Pricing
        </Link>
        <Link
          href="/login"
          className="bg-green-500 hover:bg-green-600 text-black font-semibold px-6 py-2 rounded text-sm transition"
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
              isActive(l.href) ? "text-green-400" : "text-gray-100 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/account"
          className={`text-base font-semibold transition ${
            isActive("/account") ? "text-green-400" : "text-gray-100 hover:text-white"
          }`}
        >
          Account
        </Link>
        <button
          onClick={signOut}
          className="text-base font-semibold text-gray-200 hover:text-white transition"
        >
          Sign out
        </button>
      </nav>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="md:hidden text-gray-200 p-2 -mr-2"
        aria-label="Menu"
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile dropdown panel (anchored under the sticky header) */}
      {open && (
        <div className="md:hidden absolute left-0 right-0 top-full bg-[#0b1220] border-b border-gray-800 shadow-lg">
          <div className="flex flex-col px-6 py-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`py-3 text-base font-medium border-b border-gray-800/60 ${
                  isActive(l.href) ? "text-green-400" : "text-gray-200"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className={`py-3 text-base font-medium border-b border-gray-800/60 ${
                isActive("/account") ? "text-green-400" : "text-gray-200"
              }`}
            >
              Account
            </Link>
            <button
              onClick={() => {
                setOpen(false)
                signOut()
              }}
              className="py-3 text-left text-base font-medium text-gray-400"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  )
}
