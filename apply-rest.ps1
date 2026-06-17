# apply-rest.ps1 — writes the final 2 files (layout + dashboard). Run from project root.
$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)
if (-not (Test-Path "package.json")) { Write-Host "ERROR: run from the project root." -ForegroundColor Red; exit 1 }

$layout = @'
import "./globals.css"
import Link from "next/link"
import Logo from "./components/Logo"
import Footer from "./components/Footer"
import NativeInit from "./components/NativeInit"
import AppNav from "./components/AppNav"
import Sidebar from "./components/Sidebar"
import FloatingChat from "./components/FloatingChat"
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
      <body className="bg-[#020617] text-white">

        <NativeInit />

        {/* Logged-in users get the left sidebar (desktop) + mobile drawer. */}
        {user && <Sidebar />}

        {/* Content column. Shifted right of the fixed sidebar on desktop. */}
        <div className={`flex min-h-screen flex-col ${user ? "md:pl-64" : ""}`}>

          {/* Logged-out visitors keep the original marketing top bar. */}
          {!user && (
            <header className="border-b border-gray-800 bg-[#020617]/95 backdrop-blur sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
              <div className="w-full px-6 py-4 flex justify-between items-center">
                <Link href="/" className="flex items-center hover:opacity-80 transition">
                  <Logo size="md" />
                </Link>

                <AppNav loggedIn={false} />
              </div>
            </header>
          )}

          <main className="flex-1">
            {children}
          </main>

          <Footer />
        </div>

        {user && <FloatingChat />}
      </body>
    </html>
  )
}
'@

$dash = @'
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

import SummaryCards from "@/app/components/SummaryCards"
import DebtList from "@/app/components/DebtList"
import DebtStrategyRace from "@/app/components/DebtStrategyRace"
import PaywallOverlay from "@/app/components/PaywallOverlay"
import InfoHint from "@/app/components/InfoHint"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // ✅ SAFER PROFILE FETCH
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, onboarded")
    .eq("id", user.id)
    .maybeSingle()

  // New users complete a short first-run setup before seeing the dashboard.
  if (profile && profile.onboarded === false) {
    redirect("/onboarding")
  }

  // 🔥 FALLBACK LOGIC (CRITICAL)
  let plan = "free"

  if (profile?.plan) {
    plan = profile.plan
  }

  // Fetch debts for summary cards + list
  const { data: debtsData } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", user.id)
  const debts = Array.isArray(debtsData) ? debtsData : []
  const totalDebt = debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0)
  const monthlyPayments = debts.reduce((sum, d) => sum + (Number(d.minimum_payment) || 0), 0)

  const canUseCharts = plan === "starter" || plan === "premium"
  const canUseSnowball = plan === "premium"
  const canUseAI = plan === "premium"

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Plan: <span className="text-white capitalize">{plan}</span>
        </p>
      </div>

      <SummaryCards netWorth={-totalDebt} totalDebt={totalDebt} monthlyPayments={monthlyPayments} percentPaid={0} />
      <DebtList debts={debts} />

      {/* CHARTS */}
      <div className="relative bg-[#0f172a] border border-gray-700 rounded-xl p-6 overflow-hidden">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Charts</h2>
          <InfoHint
            label="About Charts"
            text="Visual breakdowns of your balances and payoff trajectory over time. Included with Starter and Premium."
          />
        </div>

        <div className={!canUseCharts ? "opacity-40 pointer-events-none" : ""}>
          <div>{/* chart component */}</div>
        </div>

        {!canUseCharts && (
          <PaywallOverlay
            priceId="price_1TO2RmFv1EcTs6LYp5OOlvOK"
            title="Unlock Charts"
            description="Upgrade to Starter to access charts."
          />
        )}
      </div>

      {/* SNOWBALL (PREMIUM ONLY — FIXED) */}
      <div className="relative bg-[#0f172a] border border-gray-700 rounded-xl p-6 overflow-hidden">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold">Snowball &amp; Avalanche</h2>
          <InfoHint
            label="About Snowball & Avalanche"
            text="Compares two payoff strategies — Snowball (smallest balance first) vs Avalanche (highest interest first) — so you can see which clears your debt faster. Premium."
          />
        </div>

        <div className={!canUseSnowball ? "opacity-40 pointer-events-none" : ""}>
          <DebtStrategyRace plan={plan} />
        </div>

        {!canUseSnowball && (
          <PaywallOverlay
            priceId="price_1TO2SSFv1EcTs6LYVswF0AwU"
            title="Unlock Debt Strategies"
            description="Premium plan required."
          />
        )}
      </div>

      {/* AI */}
      <div className="relative bg-[#0f172a] border border-gray-700 rounded-xl p-6 overflow-hidden">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold">AI Insights</h2>
          <InfoHint
            label="About AI Insights"
            text="Personalized, AI-generated suggestions based on your debts and budget. Premium."
          />
        </div>

        <div className={!canUseAI ? "opacity-40 pointer-events-none" : ""}>
          <div>{/* AI component */}</div>
        </div>

        {!canUseAI && (
          <PaywallOverlay
            priceId="price_1TO2SSFv1EcTs6LYVswF0AwU"
            title="Unlock AI Insights"
          />
        )}
      </div>

    </div>
  )
}
'@

[System.IO.File]::WriteAllText((Join-Path (Get-Location) "app/layout.tsx"), $layout, $utf8)
Write-Host "  wrote app/layout.tsx"
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "app/dashboard/page.tsx"), $dash, $utf8)
Write-Host "  wrote app/dashboard/page.tsx"
Write-Host "Done. 2 files written." -ForegroundColor Green