import "./globals.css"
import Link from "next/link"
import Logo from "./components/Logo"
import Footer from "./components/Footer"
import NativeInit from "./components/NativeInit"
import BiometricLock from "./components/BiometricLock"
import PushNotificationsInit from "./components/PushNotificationsInit"
import ReviewPromptInit from "./components/ReviewPromptInit"
import AttributionCapture from "./components/AttributionCapture"
import PageViewTracker from "./components/PageViewTracker"
import AppNav from "./components/AppNav"
import Sidebar from "./components/Sidebar"
import FloatingChat from "./components/FloatingChat"
import FeedbackWidget from "./components/FeedbackWidget"
import LocaleCurrencySelector from "./components/LocaleCurrencySelector"
import StructuredData from "./components/StructuredData"
import { LocaleProvider } from "@/lib/i18n/LocaleProvider"
import type { LocaleCode, CurrencyCode } from "@/lib/i18n/config"
import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  metadataBase: new URL("https://paycheckplanner.ai"),
  title: "Paycheck Planner - Debt Payoff & Financial Planning Tools",
  description: "Free AI-powered financial planning tools to eliminate debt, track bills, and achieve financial freedom. Compare debt payoff strategies and get personalized recommendations.",
  keywords: ["debt payoff", "financial planning", "debt calculator", "bill tracker", "AI financial advisor"],
  authors: [{ name: "DiBeasi Global Investment LLC" }],
  creator: "DiBeasi Global Investment LLC",
  // Self-referencing canonical for the homepage. Marketing/campaign links land
  // here with UTM query params (?utm_source=...) which render identical
  // content -- without this, Search Console flags those tagged variants as
  // "Duplicate without user-selected canonical" instead of folding them into
  // this one indexed URL. Nested routes (pricing, features, login, signup)
  // set their own canonical in a route-level layout.tsx since their pages are
  // client components and can't export metadata directly.
  alternates: {
    canonical: "/",
  },
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
  let locale: LocaleCode | undefined
  let currency: CurrencyCode | undefined
  // Whether to show the logged-in app chrome (sidebar, biometric lock, push
  // init, floating chat, etc). Deliberately NOT the same as "user exists" --
  // a user mid-MFA-challenge (aal1 with a verified factor pending step-up)
  // has a session but hasn't finished signing in. Rendering the sidebar for
  // them reserves `md:pl-64` on the content column below, which is exactly
  // why the /mfa card rendered off-center: it centers itself within a
  // content area that's already been shifted right for a sidebar the user
  // can't see yet.
  //
  // The /mfa pages themselves are also excluded outright, regardless of AAL
  // status: they're full-screen interstitials that should never show the app
  // chrome, including for a "not_enrolled" user sent to /mfa/setup (that
  // case isn't caught by the AAL check above, since aal2Status is only
  // "needs_step_up" for users who already have a verified factor). The
  // current pathname isn't otherwise available to a Server Component, so
  // middleware.ts forwards it via an x-pathname request header (QA fix,
  // Aug 15 2026 -- this used to be Sidebar.tsx's own job via a pathname
  // check, which could disagree with this aal2-based decision and reproduce
  // the same off-center bug on /mfa/setup for not-yet-enrolled users).
  let showAppChrome = false

  try {
    const { createClient } = await import("@/lib/supabase/server")
    const { checkAal2Status } = await import("@/lib/adminGuard")
    const { headers } = await import("next/headers")
    const pathname = (await headers()).get("x-pathname") || ""
    const onMfaGate = pathname.startsWith("/mfa")

    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data?.user || null

    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("locale, display_currency")
        .eq("id", user.id)
        .single()
      locale = (prof?.locale as LocaleCode) || undefined
      currency = (prof?.display_currency as CurrencyCode) || undefined

      const aal2Status = await checkAal2Status(supabase)
      showAppChrome = aal2Status !== "needs_step_up" && !onMfaGate
    }
  } catch (error) {
    // Supabase not configured or error - continue without auth
    user = null
    showAppChrome = false
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#020617" />
        <StructuredData />
      </head>
      <body className="bg-[#020617] text-white">
        <LocaleProvider initialLocale={locale} initialCurrency={currency}>
          <NativeInit />
          {showAppChrome && <BiometricLock />}
          {showAppChrome && <PushNotificationsInit />}
          {showAppChrome && <ReviewPromptInit />}
          {/* PageViewTracker reads the pp_attr cookie AttributionCapture
              sets, so it must mount after it -- order matters here. */}
          <AttributionCapture />
          <PageViewTracker />

          {/* Logged-in users get the left sidebar (desktop) + mobile drawer. */}
          {showAppChrome && <Sidebar />}

          {/* Content column. Shifted right of the fixed sidebar on desktop. */}
          <div className={`flex min-h-screen flex-col ${showAppChrome ? "md:pl-64" : ""}`}>

            {/* Logged-out visitors (and users mid-MFA-challenge, who shouldn't
                see either the app chrome or the marketing bar) skip this. */}
            {!user && (
              <header className="border-b border-gray-800 bg-[#020617]/95 backdrop-blur sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
                <div className="w-full px-6 py-4 flex flex-wrap gap-y-3 justify-between items-center">
                  <Link href="/" className="flex items-center hover:opacity-80 transition">
                    <Logo size="md" />
                  </Link>

                  <div className="flex items-center gap-4">
                    <LocaleCurrencySelector inline />
                    <AppNav loggedIn={false} />
                  </div>
                </div>
              </header>
            )}

            {/* The fixed top-right language/currency widget (Sidebar.tsx, "fixed
                top-4 right-4") floats over whatever is at the top-right of the
                viewport. Logged-in pages often put a button/badge there (e.g.
                the Payoff Plan header), so give every logged-in page enough
                top clearance here, once, instead of patching each page. */}
            <main className={`flex-1 ${showAppChrome ? "md:pt-20" : ""}`}>
              {children}
            </main>

            <Footer />
          </div>

          {showAppChrome && <FloatingChat />}
          {showAppChrome && <FeedbackWidget />}
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  )
}