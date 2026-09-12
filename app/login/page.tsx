"use client"

import { Suspense, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { siteUrl } from "@/lib/siteUrl"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { isNativeApp, useIsIOSApp } from "@/lib/platform"
import { useLocale } from "@/lib/i18n/LocaleProvider"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get("message")
  const { t } = useLocale()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(message || "")
  const [loading, setLoading] = useState(false)

  // No MFA state here any more -- see handleLogin. This page used to run its
  // own second-factor challenge, a worse duplicate of the one on /mfa.
  // App Store Guideline 4.8: an app that offers third-party/social login
  // must also offer Sign in with Apple as an equivalent option. Rather than
  // build that (Apple Developer Services ID + Supabase provider config),
  // the Google button is simply not shown on iOS -- email/password still
  // works there. Default-deny like the purchase-UI gates elsewhere in
  // lib/platform.ts: `ios` is null until mounted, so the button only shows
  // once the platform is confirmed non-iOS, never as a pre-mount flash.
  const ios = useIsIOSApp()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) {
        setError(loginError.message)
        return
      }

      // Check directly for a verified factor. A fresh session can report
      // aal1 even when a verified factor exists, so this checks factors
      // directly instead of relying on the assurance-level next-step field.
      //
      // Sep 12 2026, Vince: "OTP doesn't let you login sometimes." Two bugs
      // lived in the five lines this replaces.
      //
      // 1. The error from listFactors() was never checked. On a failure --
      //    a dropped request in the Android WebView is enough -- `factors`
      //    came back undefined, `totp` was undefined, and control fell
      //    straight through to /dashboard with a session still at aal1 and a
      //    second factor never presented. The user was "signed in" without
      //    completing MFA, and then hit the dead end described in
      //    app/layout.tsx. Any error now stops the login instead.
      //
      // 2. `.find()` returns the FIRST verified TOTP factor, and an account
      //    can legitimately have more than one -- this account has exactly
      //    that: an authenticator-app factor and a separately enrolled
      //    email-backup factor (both stored as TOTP, see
      //    app/api/mfa/email/send). This screen always challenged the older
      //    one and offered no way to switch, so if the code you had was for
      //    the other factor, it could never verify. That is the "sometimes"
      //    in the report: it depended on which factor you happened to be
      //    holding a code for.
      //
      // Rather than fix both here, the challenge is handed to /mfa, which
      // already solves all of it -- it retargets factorId when a code is
      // emailed, offers "use my authenticator instead", and does not trap a
      // user who has no usable factor. One challenge screen, not two.
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
      if (factorsError) {
        setError(t("login.genericError"))
        return
      }
      const hasVerifiedFactor = (factors?.all ?? []).some((f) => f.status === "verified")
      if (hasVerifiedFactor) {
        window.location.href = "/mfa?redirectTo=%2Fdashboard"
        return
      }

      window.location.href = "/dashboard"
    } catch {
      setError(t("login.genericError"))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError("")
    setLoading(true)
    try {
      // Google blocks OAuth inside embedded webviews (disallowed_useragent).
      // On native we must open the system browser and deep-link back; the
      // callback is then handled by <NativeInit/> (app/components/NativeInit.tsx).
      if (isNativeApp()) {
        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            // Custom-scheme deep link back into the app. Must also be added to
            // Supabase > Auth > URL Configuration > Redirect URLs, and registered
            // in the native projects (iOS URL scheme / Android intent filter).
            redirectTo: "com.dibeasi.paycheckplanner://auth-callback",
            skipBrowserRedirect: true,
          },
        })
        if (oauthError) {
          setError(oauthError.message)
          return
        }
        if (data?.url) {
          const { Browser } = await import("@capacitor/browser")
          await Browser.open({ url: data.url })
        }
        return
      }

      // Web: normal redirect through the server callback route.
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteUrl()}/auth/callback`,
        },
      })
      if (oauthError) setError(oauthError.message)
    } catch {
      setError(t("login.googleError"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center px-6">
      <div className="bg-[#0f172a] border border-gray-800 p-8 rounded-lg w-full max-w-md">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded text-sm mb-4">
            {error}
          </div>
        )}

        {/* ---- Email + Google sign-in ---- */}
        <>
            <h2 className="text-2xl font-bold mb-2">{t("login.welcomeBack")}</h2>
            <p className="text-gray-400 text-sm mb-6">
              {t("login.welcomeBackSubtitle")}
            </p>

            {ios === false && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full border border-gray-700 bg-[#1a233a] hover:bg-[#2a3f5f] rounded-lg py-3 px-4 flex items-center justify-center gap-3 transition disabled:opacity-50"
                >
                  <img
                    src="https://www.svgrepo.com/show/475656/google-color.svg"
                    alt="Google"
                    className="w-5 h-5"
                  />
                  <span className="text-white font-medium">{t("login.continueWithGoogle")}</span>
                </button>

                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gray-700"></div>
                  <span className="text-gray-500 text-sm">{t("login.or")}</span>
                  <div className="flex-1 h-px bg-gray-700"></div>
                </div>
              </>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                placeholder={t("login.emailPlaceholder")}
                className="w-full bg-[#1a233a] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder={t("login.passwordPlaceholder")}
                className="w-full bg-[#1a233a] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm text-green-500 hover:text-green-400 transition">
                  {t("login.forgotPassword")}
                </Link>
              </div>
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-semibold py-3 rounded-lg transition"
              >
                {loading ? t("login.loggingIn") : t("login.logIn")}
              </button>
            </form>

            <div className="border-t border-gray-700 mt-6 pt-6 text-center text-sm">
              <p className="text-gray-400">
                {t("login.noAccount")}{" "}
                <Link href="/signup" className="text-green-500 hover:text-green-400 font-semibold">
                  {t("login.signUpFree")}
                </Link>
              </p>
            </div>
        </>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
