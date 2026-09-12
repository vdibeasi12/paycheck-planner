import "./globals.css"
import { Inter } from "next/font/google"
import Link from "next/link"
import Logo from "./components/Logo"
import Footer from "./components/Footer"
import NativeInit from "./components/NativeInit"
import BiometricLock from "./components/BiometricLock"
import PushNotificationsInit from "./components/PushNotificationsInit"
import ReviewPromptInit from "./components/ReviewPromptInit"
import AttributionCapture from "./components/AttributionCapture"
import PageViewTracker from "./components/PageViewTracker"
import { redirect } from "next/navigation"
import AppNav from "./components/AppNav"
import { isProtectedPath } from "@/lib/protectedRoutes"
import Sidebar from "./components/Sidebar"
import FloatingChat from "./components/FloatingChat"
import FeedbackWidget from "./components/FeedbackWidget"
import DisplaySettingsMenu from "./components/DisplaySettingsMenu"
import { ThemeProvider, THEME_INIT_SCRIPT } from "./components/ThemeProvider"
import StructuredData from "./components/StructuredData"
import { LocaleProvider } from "@/lib/i18n/LocaleProvider"
import type { LocaleCode, CurrencyCode } from "@/lib/i18n/config"
import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"

// REVISED Sep 9 2026, Vince: "use Inter throughout the application" (part of
// the light-mode contrast/typography pass) -- swapped from Plus Jakarta Sans
// (the Aug 23 2026 homepage-redesign pick). Same loading mechanism: loaded
// once here and applied via CSS variable so every page picks it up
// automatically; falls back to the system stack (see globals.css) if the
// Google Fonts request is ever blocked (e.g. a restrictive corporate
// network). Weight 450 isn't a real variable-font stop Google serves for
// static Inter, so body text uses 400 with the font's own slightly heavier
// default metrics rather than a synthetic in-between weight.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
})

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
    // Was a different tagline than the <title>/meta description above --
    // fixed Aug 26 2026 so the tab title, search snippet, and social share
    // card all say the same thing instead of drifting into two brand lines.
    title: "Paycheck Planner - Debt Payoff & Financial Planning Tools",
    description: "Free AI-powered financial planning tools to eliminate debt, track bills, and achieve financial freedom. Compare debt payoff strategies and get personalized recommendations.",
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
  // Set inside the try below; acted on AFTER it. redirect() signals by
  // throwing, so calling it inside that try/catch would have the catch
  // swallow it and silently leave the user on the dead-end page.
  let stepUpFrom: string | null = null

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

      // THE DEAD END (Sep 12 2026, Vince: "you can't do anything... I had to
      // uninstall and reinstall to refresh").
      //
      // A session sitting at aal1 with a verified factor still pending -- get
      // one by closing the app mid-OTP, which in the Android WebView leaves
      // the cookie behind and reopens straight onto /dashboard -- set
      // showAppChrome false above. That is correct for the /mfa interstitial
      // it was written for, but on /dashboard it rendered the page with NO
      // sidebar, NO mobile header, NO sign-out: every route out of the screen
      // is in the chrome that was just suppressed. And nothing anywhere sent
      // the user to /mfa to finish, because middleware only redirects when
      // there is no user at all -- this user has one.
      //
      // So the app was unusable and unescapable, and the only exit was
      // clearing the cookie by uninstalling. Finish the sign-in instead. This
      // costs nothing: checkAal2Status already ran on the line above.
      //
      // Scoped to protected routes on purpose -- someone half-signed-in who
      // is reading /pricing or the blog should be left alone, not yanked into
      // a challenge screen.
      if (aal2Status === "needs_step_up" && !onMfaGate && isProtectedPath(pathname)) {
        stepUpFrom = pathname
      }
    }
  } catch (error) {
    // Supabase not configured or error - continue without auth
    user = null
    showAppChrome = false
  }

  if (stepUpFrom) {
    redirect("/mfa?redirectTo=" + encodeURIComponent(stepUpFrom))
  }

  return (
    // suppressHydrationWarning: the no-flash script below sets data-theme on
    // this element synchronously, before React hydrates, based on
    // localStorage/prefers-color-scheme -- something the server can't know
    // when it renders this same tag. That's an intentional, expected
    // mismatch (the alternative is a flash of the wrong theme on every
    // load), not a real hydration bug -- see app/components/ThemeProvider.tsx.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#020617" />
        <StructuredData />
        {/* Must run before first paint, as a plain script (not a React
            effect, which only runs after hydration and would flash the
            wrong theme first). Kept in lock-step with ThemeProvider's own
            initial-resolve logic via the shared THEME_INIT_SCRIPT/
            THEME_STORAGE_KEY constants -- see that file. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${inter.variable} bg-canvas text-primary`} suppressHydrationWarning>
        <ThemeProvider>
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
              <header className="border-b border-default bg-canvas/95 backdrop-blur sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
                <div className="w-full px-6 py-4 flex flex-wrap gap-y-3 justify-between items-center">
                  <Link href="/" className="flex items-center hover:opacity-80 transition">
                    <Logo size="md" />
                  </Link>

                  {/* gap-2 on a phone, gap-4 once there is room. The old
                      flat gap-4 spent 24px of a 360px screen on whitespace
                      between controls that were already overflowing. */}
                  <div className="flex items-center gap-2 sm:gap-4">
                    <DisplaySettingsMenu />
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
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}