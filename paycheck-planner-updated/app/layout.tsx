import "./globals.css"
import Link from "next/link"
import Logo from "./components/Logo"
import AISupportChat from "./components/AISupportChat"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "Paycheck Planner - Smart Debt Elimination",
  description: "Master your money and eliminate debt fast with AI-powered strategies",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body className="bg-slate-900 text-white">
        <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              {/* Logo */}
              <Link 
                href="/" 
                className="flex items-center hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-3">
                  <Logo size="lg" />
                  <span className="text-xl font-bold text-white hidden sm:inline">
                    Paycheck Planner
                  </span>
                </div>
              </Link>

              {/* Navigation */}
              <nav className="flex items-center gap-8">
                <Link 
                  href="/pricing"
                  className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
                >
                  Pricing
                </Link>

                <div className="flex items-center gap-4">
                  {user ? (
                    <>
                      <Link 
                        href="/dashboard"
                        className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
                      >
                        Dashboard
                      </Link>
                      <form action="/auth/logout" method="POST">
                        <button
                          type="submit"
                          className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
                        >
                          Logout
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      <Link 
                        href="/login"
                        className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
                      >
                        Login
                      </Link>
                      <Link
                        href="/signup"
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </div>
          </div>
        </header>

        <main className="min-h-screen">
          {children}
        </main>

        <AISupportChat />
      </body>
    </html>
  )
}