import "./globals.css"
import Link from "next/link"
import Logo from "./components/Logo"
import Footer from "./components/Footer"
import NativeInit from "./components/NativeInit"
import AppNav from "./components/AppNav"
import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  title: "Paycheck Planner - Debt Payoff & Financial Planning Tools",
  description: "Free AI-powered financial planning tools to eliminate debt, track bills, and achieve financial freedom. Compare debt payoff strategies and get personalized recommendations.",
  keywords: ["debt payoff", "financial planning", "debt calculator", "bill tracker", "AI financial advisor"],
  authors: [{ name: "DiBeasi Global Investment LLC" }],
  creator: "DiBeasi Global Investment LLC",
  openGraph: {
    title: "Paycheck Planner - Take Control of Your Finances",
    description: "Free AI-powered financial planning tools to eliminate debt and achieve financial freedom.",
    url: "https://paycheckplanner.ai",
    siteName: "Paycheck Planner",
    images: [
      {
        url: "/logo.png",
        width: 200,
        height: 200,
        alt: "Paycheck Planner Logo",
      },
    ],
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // lets content extend under the notch; we pad with safe-area insets
  themeColor: "#020617",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user: any = null

  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  } catch (error) {
    // Supabase not configured or error - continue without auth
    user = null
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#020617" />
      </head>
      <body className="bg-[#020617] text-white flex flex-col min-h-screen">

        <NativeInit />

        <header className="border-b border-gray-800 bg-[#020617]/95 backdrop-blur sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
          <div className="w-full px-6 py-4 flex justify-between items-center">
            <Link href="/" className="flex items-center hover:opacity-80 transition">
              <Logo size="2xl" />
            </Link>

            <AppNav loggedIn={!!user} />
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  )
}