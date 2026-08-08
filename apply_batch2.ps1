# Batch 2: login, signup, features pages + translations (merged into existing json files)
[Environment]::CurrentDirectory = (Get-Location).Path
$ErrorActionPreference = "Stop"

$tsx_app_login_page_tsx = @'
"use client"

import { Suspense, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { siteUrl } from "@/lib/siteUrl"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { isNativeApp } from "@/lib/platform"
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

  // MFA challenge state
  const [mfaRequired, setMfaRequired] = useState(false)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState("")

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

      // If the account has 2FA, Supabase reports a required step up to aal2.
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const totp = factors?.totp?.[0]
        if (totp) {
          setFactorId(totp.id)
          setMfaRequired(true)
          return
        }
      }

      window.location.href = "/dashboard"
    } catch {
      setError(t("login.genericError"))
    } finally {
      setLoading(false)
    }
  }

  const verifyMfa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId) return
    setError("")
    setLoading(true)
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
      if (cErr) {
        setError(cErr.message)
        return
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: mfaCode,
      })
      if (vErr) {
        setError(vErr.message)
        return
      }
      window.location.href = "/dashboard"
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

        {mfaRequired ? (
          /* ---- MFA challenge ---- */
          <>
            <h2 className="text-2xl font-bold mb-2">{t("login.twoFactorTitle")}</h2>
            <p className="text-gray-400 text-sm mb-6">
              {t("login.twoFactorSubtitle")}
            </p>
            <form onSubmit={verifyMfa} className="space-y-4">
              <input
                inputMode="numeric"
                autoFocus
                placeholder="123456"
                className="w-full bg-[#1a233a] border border-gray-700 rounded-lg px-4 py-3 text-center text-xl tracking-[0.4em] text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
              <button
                type="submit"
                disabled={loading || mfaCode.length < 6}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-semibold py-3 rounded-lg transition"
              >
                {loading ? t("login.verifying") : t("login.verify")}
              </button>
            </form>
          </>
        ) : (
          /* ---- Email + Google sign-in ---- */
          <>
            <h2 className="text-2xl font-bold mb-2">{t("login.welcomeBack")}</h2>
            <p className="text-gray-400 text-sm mb-6">
              {t("login.welcomeBackSubtitle")}
            </p>

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
        )}
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

'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "app/login/page.tsx"), $tsx_app_login_page_tsx, (New-Object System.Text.UTF8Encoding($false)))
$hash_tsx_app_login_page_tsx = (Get-FileHash -Path "app/login/page.tsx" -Algorithm SHA256).Hash.ToLower()
if ($hash_tsx_app_login_page_tsx -eq "342ddc4ecaa92ed4fc94ee024ebc7a1b7c76d55bb600df86c5a14e256e925e51") { Write-Host "OK   app/login/page.tsx" -ForegroundColor Green } else { Write-Host "FAIL app/login/page.tsx" -ForegroundColor Red; $global:anyFail = $true }

$tsx_app_signup_page_tsx = @'
"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { isNativeApp } from "@/lib/platform"
import { useLocale } from "@/lib/i18n/LocaleProvider"

export default function SignupPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleGoogleSignup = async () => {
    if (!agreed) {
      setError(t("signup.errorAgreeTerms"))
      return
    }
    setError("")
    setLoading(true)
    try {
      // Google blocks OAuth inside embedded webviews (disallowed_useragent).
      // On native we open the system browser and deep-link back; the callback
      // is handled by <NativeInit/> (app/components/NativeInit.tsx).
      if (isNativeApp()) {
        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
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
          redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
        },
      })
      if (oauthError) setError(oauthError.message)
    } catch {
      setError(t("signup.errorGoogle"))
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!agreed) {
      setError(t("signup.errorAgreeTerms"))
      return
    }

    setLoading(true)

    if (password !== confirmPassword) {
      setError(t("signup.errorPasswordMismatch"))
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError(t("signup.errorPasswordLength"))
      setLoading(false)
      return
    }

    try {
      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
        }
      })

      if (signupError) {
        setError(signupError.message)
      } else {
        router.push("/login?message=Check%20your%20email%20to%20confirm%20your%20account")
      }
    } catch (err) {
      setError(t("signup.errorGeneric"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center px-6">
      <div className="bg-[#0f172a] border border-gray-800 p-8 rounded-lg w-full max-w-md">

        <h2 className="text-2xl font-bold mb-2">{t("signup.createAccount")}</h2>
        <p className="text-gray-400 text-sm mb-6">{t("signup.createAccountSubtitle")}</p>

        <label className="flex items-start gap-2 text-sm text-gray-400 mb-6">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-700 bg-[#1a233a] accent-green-500"
            required
          />
          <span>
            {t("signup.agreeToTerms")}{" "}
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-400 underline">
              {t("signup.termsOfService")}
            </Link>{" "}
            {t("signup.and")}{" "}
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-400 underline">
              {t("signup.privacyPolicy")}
            </Link>
            .
          </span>
        </label>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded text-sm mb-4">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading || !agreed}
          className="w-full border border-gray-700 bg-[#1a233a] hover:bg-[#2a3f5f] rounded-lg py-3 px-4 flex items-center justify-center gap-3 transition disabled:opacity-50">
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5"
          />
          <span className="text-white font-medium">{t("signup.continueWithGoogle")}</span>
        </button>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gray-700"></div>
          <span className="text-gray-500 text-sm">{t("signup.or")}</span>
          <div className="flex-1 h-px bg-gray-700"></div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="email"
            placeholder={t("signup.emailPlaceholder")}
            className="w-full bg-[#1a233a] border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder={t("signup.passwordPlaceholder")}
            className="w-full bg-[#1a233a] border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder={t("signup.confirmPasswordPlaceholder")}
            className="w-full bg-[#1a233a] border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading || !email || !password || !confirmPassword || !agreed}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-semibold py-3 rounded transition"
          >
            {loading ? t("signup.creatingAccount") : t("signup.signUpFree")}
          </button>
        </form>

        <div className="border-t border-gray-700 mt-6 pt-6 text-center text-sm">
          <p className="text-gray-400">
            {t("signup.alreadyHaveAccount")}{' '}
            <Link href="/login" className="text-green-500 hover:text-green-400 font-semibold">
              {t("signup.logIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "app/signup/page.tsx"), $tsx_app_signup_page_tsx, (New-Object System.Text.UTF8Encoding($false)))
$hash_tsx_app_signup_page_tsx = (Get-FileHash -Path "app/signup/page.tsx" -Algorithm SHA256).Hash.ToLower()
if ($hash_tsx_app_signup_page_tsx -eq "9a9262adba541eeeaf1f22a8eb96489a2398bf05199e081c8c213273c5c60ee4") { Write-Host "OK   app/signup/page.tsx" -ForegroundColor Green } else { Write-Host "FAIL app/signup/page.tsx" -ForegroundColor Red; $global:anyFail = $true }

$tsx_app_features_page_tsx = @'
"use client"

import { useLocale } from "@/lib/i18n/LocaleProvider"

export default function FeaturesPage() {
  const { t } = useLocale()

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-4">{t("features.title")}</h1>
        <p className="text-gray-300 text-lg mb-12">
          {t("features.subtitle")}
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Feature 1 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-2xl font-bold mb-3">{t("features.f1Title")}</h2>
            <p className="text-gray-300 mb-4">
              {t("features.f1Desc")}
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ {t("features.f1B1")}</li>
              <li>✓ {t("features.f1B2")}</li>
              <li>✓ {t("features.f1B3")}</li>
              <li>✓ {t("features.f1B4")}</li>
            </ul>
          </div>

          {/* Feature 2 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">📸</div>
            <h2 className="text-2xl font-bold mb-3">{t("features.f2Title")}</h2>
            <p className="text-gray-300 mb-4">
              {t("features.f2Desc")}
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ {t("features.f2B1")}</li>
              <li>✓ {t("features.f2B2")}</li>
              <li>✓ {t("features.f2B3")}</li>
              <li>✓ {t("features.f2B4")}</li>
            </ul>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">📈</div>
            <h2 className="text-2xl font-bold mb-3">{t("features.f3Title")}</h2>
            <p className="text-gray-300 mb-4">
              {t("features.f3Desc")}
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ {t("features.f3B1")}</li>
              <li>✓ {t("features.f3B2")}</li>
              <li>✓ {t("features.f3B3")}</li>
              <li>✓ {t("features.f3B4")}</li>
            </ul>
          </div>

          {/* Feature 4 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold mb-3">{t("features.f4Title")}</h2>
            <p className="text-gray-300 mb-4">
              {t("features.f4Desc")}
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ {t("features.f4B1")}</li>
              <li>✓ {t("features.f4B2")}</li>
              <li>✓ {t("features.f4B3")}</li>
              <li>✓ {t("features.f4B4")}</li>
            </ul>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-8 mb-12">
          <h2 className="text-3xl font-bold mb-8">{t("features.whyChoose")}</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold text-green-400 mb-3">{t("features.fastSetupTitle")}</h3>
              <p className="text-gray-300">
                {t("features.fastSetupDesc")}
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-blue-400 mb-3">{t("features.secureTitle")}</h3>
              <p className="text-gray-300">
                {t("features.secureDesc")}
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-purple-400 mb-3">{t("features.availableTitle")}</h3>
              <p className="text-gray-300">
                {t("features.availableDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-[#0f172a] border border-gray-700 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">{t("features.ctaTitle")}</h2>
          <p className="text-gray-300 mb-6">
            {t("features.ctaSubtitle")}
          </p>
          
            href="/pricing"
            className="inline-block bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg transition"
          >
            {t("features.ctaButton")}
          </a>
        </div>
      </div>
    </div>
  )
}

'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "app/features/page.tsx"), $tsx_app_features_page_tsx, (New-Object System.Text.UTF8Encoding($false)))
$hash_tsx_app_features_page_tsx = (Get-FileHash -Path "app/features/page.tsx" -Algorithm SHA256).Hash.ToLower()
if ($hash_tsx_app_features_page_tsx -eq "e066f5cdabb251425bdf06366d7e0a206ef6684caa3eb3f7df571e2ac67bfc1a") { Write-Host "OK   app/features/page.tsx" -ForegroundColor Green } else { Write-Host "FAIL app/features/page.tsx" -ForegroundColor Red; $global:anyFail = $true }

$fragment_en = @'
{
  "login": {
    "welcomeBack": "Welcome Back",
    "welcomeBackSubtitle": "Take control of every paycheck, debt, and financial goal.",
    "continueWithGoogle": "Continue with Google",
    "or": "or",
    "emailPlaceholder": "Email address",
    "passwordPlaceholder": "Password",
    "forgotPassword": "Forgot Password?",
    "logIn": "Log In",
    "loggingIn": "Logging in...",
    "noAccount": "Don't have an account?",
    "signUpFree": "Sign Up Free",
    "twoFactorTitle": "Two-factor verification",
    "twoFactorSubtitle": "Enter the 6-digit code from your authenticator app.",
    "verify": "Verify",
    "verifying": "Verifying...",
    "genericError": "An error occurred. Please try again.",
    "googleError": "An error occurred with Google sign-in. Please try again."
  },
  "signup": {
    "createAccount": "Create Account",
    "createAccountSubtitle": "Join thousands taking control of their finances",
    "agreeToTerms": "I agree to the",
    "termsOfService": "Terms of Service",
    "and": "and",
    "privacyPolicy": "Privacy Policy",
    "continueWithGoogle": "Continue with Google",
    "or": "or",
    "emailPlaceholder": "Email address",
    "passwordPlaceholder": "Password (min 8 characters)",
    "confirmPasswordPlaceholder": "Confirm password",
    "signUpFree": "Sign Up Free",
    "creatingAccount": "Creating Account...",
    "alreadyHaveAccount": "Already have an account?",
    "logIn": "Log In",
    "errorAgreeTerms": "Please agree to the Terms of Service and Privacy Policy to continue.",
    "errorPasswordMismatch": "Passwords do not match",
    "errorPasswordLength": "Password must be at least 8 characters",
    "errorGeneric": "An error occurred. Please try again.",
    "errorGoogle": "An error occurred with Google sign-in. Please try again."
  },
  "features": {
    "title": "Powerful Features to Master Your Money",
    "subtitle": "Everything you need to eliminate debt, plan your finances, and achieve financial freedom.",
    "f1Title": "Debt Payoff Calculator",
    "f1Desc": "Compare Snowball and Avalanche debt payoff strategies side-by-side. See exactly how long it will take to become debt-free and how much interest you'll pay.",
    "f1B1": "Add unlimited debts",
    "f1B2": "Track interest rates",
    "f1B3": "Set extra payment amounts",
    "f1B4": "Export comparison reports",
    "f2Title": "Bill OCR & Upload",
    "f2Desc": "Take a photo of your bills and our AI automatically extracts vendor name, amount, and due date. Never manually enter bill information again.",
    "f2B1": "Snap photos of bills",
    "f2B2": "Automatic data extraction",
    "f2B3": "Confidence scoring",
    "f2B4": "Manual corrections available",
    "f3Title": "Financial Dashboard",
    "f3Desc": "See all your finances at a glance. Track debts, bills, assets, and net worth with beautiful charts and real-time calculations.",
    "f3B1": "Real-time metrics",
    "f3B2": "Multiple visualizations",
    "f3B3": "Debt-to-income ratio",
    "f3B4": "Net worth tracking",
    "f4Title": "AI Recommendations (Premium)",
    "f4Desc": "Get personalized financial advice powered by AI. Discover strategies to save money, optimize your debt payoff, and reach your goals faster.",
    "f4B1": "Smart suggestions",
    "f4B2": "Impact scoring",
    "f4B3": "Savings estimates",
    "f4B4": "Personalized strategies",
    "whyChoose": "Why Choose Paycheck Planner?",
    "fastSetupTitle": "⚡ Fast Setup",
    "fastSetupDesc": "Get started in minutes. No complicated forms or lengthy onboarding. Just enter your debts and get instant insights.",
    "secureTitle": "🔒 Secure & Private",
    "secureDesc": "Your financial data is encrypted and protected. We never share your information with third parties.",
    "availableTitle": "📱 Always Available",
    "availableDesc": "Access your finances anytime, anywhere. Fully responsive design works on mobile, tablet, and desktop.",
    "ctaTitle": "Ready to Take Control?",
    "ctaSubtitle": "Start with our Free plan and upgrade anytime to unlock premium features.",
    "ctaButton": "View Plans & Pricing"
  }
}
'@ | ConvertFrom-Json
$existing_en = Get-Content -Path "lib/i18n/messages/en.json" -Raw | ConvertFrom-Json
$existing_en | Add-Member -NotePropertyName "login" -NotePropertyValue $fragment_en.login -Force
$existing_en | Add-Member -NotePropertyName "signup" -NotePropertyValue $fragment_en.signup -Force
$existing_en | Add-Member -NotePropertyName "features" -NotePropertyValue $fragment_en.features -Force
$existing_en | ConvertTo-Json -Depth 10 | Set-Content -Path "lib/i18n/messages/en.json" -Encoding UTF8
$check_en = Get-Content -Path "lib/i18n/messages/en.json" -Raw | ConvertFrom-Json
if ($check_en.login.welcomeBack -and $check_en.signup.createAccount -and $check_en.features.title) { Write-Host "OK   lib/i18n/messages/en.json" -ForegroundColor Green } else { Write-Host "FAIL lib/i18n/messages/en.json" -ForegroundColor Red; $global:anyFail = $true }

$fragment_es = @'
{
  "login": {
    "welcomeBack": "Bienvenido de nuevo",
    "welcomeBackSubtitle": "Toma el control de cada cheque, deuda y meta financiera.",
    "continueWithGoogle": "Continuar con Google",
    "or": "o",
    "emailPlaceholder": "Correo electrónico",
    "passwordPlaceholder": "Contraseña",
    "forgotPassword": "¿Olvidaste tu contraseña?",
    "logIn": "Iniciar sesión",
    "loggingIn": "Iniciando sesión...",
    "noAccount": "¿No tienes una cuenta?",
    "signUpFree": "Regístrate gratis",
    "twoFactorTitle": "Verificación en dos pasos",
    "twoFactorSubtitle": "Ingresa el código de 6 dígitos de tu app de autenticación.",
    "verify": "Verificar",
    "verifying": "Verificando...",
    "genericError": "Ocurrió un error. Inténtalo de nuevo.",
    "googleError": "Ocurrió un error al iniciar sesión con Google. Inténtalo de nuevo."
  },
  "signup": {
    "createAccount": "Crear cuenta",
    "createAccountSubtitle": "Únete a miles de personas que ya controlan sus finanzas",
    "agreeToTerms": "Acepto los",
    "termsOfService": "Términos de servicio",
    "and": "y",
    "privacyPolicy": "Política de privacidad",
    "continueWithGoogle": "Continuar con Google",
    "or": "o",
    "emailPlaceholder": "Correo electrónico",
    "passwordPlaceholder": "Contraseña (mín. 8 caracteres)",
    "confirmPasswordPlaceholder": "Confirmar contraseña",
    "signUpFree": "Regístrate gratis",
    "creatingAccount": "Creando cuenta...",
    "alreadyHaveAccount": "¿Ya tienes una cuenta?",
    "logIn": "Iniciar sesión",
    "errorAgreeTerms": "Acepta los Términos de servicio y la Política de privacidad para continuar.",
    "errorPasswordMismatch": "Las contraseñas no coinciden",
    "errorPasswordLength": "La contraseña debe tener al menos 8 caracteres",
    "errorGeneric": "Ocurrió un error. Inténtalo de nuevo.",
    "errorGoogle": "Ocurrió un error al registrarte con Google. Inténtalo de nuevo."
  },
  "features": {
    "title": "Funciones potentes para dominar tu dinero",
    "subtitle": "Todo lo que necesitas para eliminar deudas, planificar tus finanzas y alcanzar la libertad financiera.",
    "f1Title": "Calculadora de pago de deudas",
    "f1Desc": "Compara las estrategias de pago Bola de Nieve y Avalancha una junto a la otra. Descubre exactamente cuánto tardarás en liberarte de deudas y cuánto interés pagarás.",
    "f1B1": "Agrega deudas ilimitadas",
    "f1B2": "Rastrea tasas de interés",
    "f1B3": "Define pagos adicionales",
    "f1B4": "Exporta informes comparativos",
    "f2Title": "OCR y carga de facturas",
    "f2Desc": "Toma una foto de tus facturas y nuestra IA extrae automáticamente el proveedor, el monto y la fecha de vencimiento. Nunca más ingreses datos manualmente.",
    "f2B1": "Toma fotos de facturas",
    "f2B2": "Extracción automática de datos",
    "f2B3": "Puntuación de confianza",
    "f2B4": "Correcciones manuales disponibles",
    "f3Title": "Panel financiero",
    "f3Desc": "Ve todas tus finanzas de un vistazo. Rastrea deudas, facturas, activos y patrimonio neto con gráficos atractivos y cálculos en tiempo real.",
    "f3B1": "Métricas en tiempo real",
    "f3B2": "Múltiples visualizaciones",
    "f3B3": "Relación deuda-ingresos",
    "f3B4": "Seguimiento del patrimonio neto",
    "f4Title": "Recomendaciones con IA (Premium)",
    "f4Desc": "Recibe consejos financieros personalizados impulsados por IA. Descubre estrategias para ahorrar dinero, optimizar el pago de deudas y alcanzar tus metas más rápido.",
    "f4B1": "Sugerencias inteligentes",
    "f4B2": "Puntuación de impacto",
    "f4B3": "Estimaciones de ahorro",
    "f4B4": "Estrategias personalizadas",
    "whyChoose": "¿Por qué elegir Paycheck Planner?",
    "fastSetupTitle": "⚡ Configuración rápida",
    "fastSetupDesc": "Comienza en minutos. Sin formularios complicados ni procesos largos. Solo ingresa tus deudas y obtén información al instante.",
    "secureTitle": "🔒 Seguro y privado",
    "secureDesc": "Tus datos financieros están cifrados y protegidos. Nunca compartimos tu información con terceros.",
    "availableTitle": "📱 Siempre disponible",
    "availableDesc": "Accede a tus finanzas en cualquier momento y lugar. Diseño totalmente adaptable en móvil, tablet y escritorio.",
    "ctaTitle": "¿Listo para tomar el control?",
    "ctaSubtitle": "Comienza con nuestro plan gratuito y mejora cuando quieras para desbloquear funciones premium.",
    "ctaButton": "Ver planes y precios"
  }
}
'@ | ConvertFrom-Json
$existing_es = Get-Content -Path "lib/i18n/messages/es.json" -Raw | ConvertFrom-Json
$existing_es | Add-Member -NotePropertyName "login" -NotePropertyValue $fragment_es.login -Force
$existing_es | Add-Member -NotePropertyName "signup" -NotePropertyValue $fragment_es.signup -Force
$existing_es | Add-Member -NotePropertyName "features" -NotePropertyValue $fragment_es.features -Force
$existing_es | ConvertTo-Json -Depth 10 | Set-Content -Path "lib/i18n/messages/es.json" -Encoding UTF8
$check_es = Get-Content -Path "lib/i18n/messages/es.json" -Raw | ConvertFrom-Json
if ($check_es.login.welcomeBack -and $check_es.signup.createAccount -and $check_es.features.title) { Write-Host "OK   lib/i18n/messages/es.json" -ForegroundColor Green } else { Write-Host "FAIL lib/i18n/messages/es.json" -ForegroundColor Red; $global:anyFail = $true }

$fragment_fr = @'
{
  "login": {
    "welcomeBack": "Bon retour",
    "welcomeBackSubtitle": "Prenez le contrôle de chaque paie, dette et objectif financier.",
    "continueWithGoogle": "Continuer avec Google",
    "or": "ou",
    "emailPlaceholder": "Adresse e-mail",
    "passwordPlaceholder": "Mot de passe",
    "forgotPassword": "Mot de passe oublié ?",
    "logIn": "Se connecter",
    "loggingIn": "Connexion en cours...",
    "noAccount": "Vous n'avez pas de compte ?",
    "signUpFree": "S'inscrire gratuitement",
    "twoFactorTitle": "Vérification en deux étapes",
    "twoFactorSubtitle": "Entrez le code à 6 chiffres de votre application d'authentification.",
    "verify": "Vérifier",
    "verifying": "Vérification...",
    "genericError": "Une erreur s'est produite. Veuillez réessayer.",
    "googleError": "Une erreur s'est produite avec la connexion Google. Veuillez réessayer."
  },
  "signup": {
    "createAccount": "Créer un compte",
    "createAccountSubtitle": "Rejoignez des milliers de personnes qui contrôlent leurs finances",
    "agreeToTerms": "J'accepte les",
    "termsOfService": "Conditions d'utilisation",
    "and": "et",
    "privacyPolicy": "Politique de confidentialité",
    "continueWithGoogle": "Continuer avec Google",
    "or": "ou",
    "emailPlaceholder": "Adresse e-mail",
    "passwordPlaceholder": "Mot de passe (min. 8 caractères)",
    "confirmPasswordPlaceholder": "Confirmer le mot de passe",
    "signUpFree": "S'inscrire gratuitement",
    "creatingAccount": "Création du compte...",
    "alreadyHaveAccount": "Vous avez déjà un compte ?",
    "logIn": "Se connecter",
    "errorAgreeTerms": "Veuillez accepter les Conditions d'utilisation et la Politique de confidentialité pour continuer.",
    "errorPasswordMismatch": "Les mots de passe ne correspondent pas",
    "errorPasswordLength": "Le mot de passe doit contenir au moins 8 caractères",
    "errorGeneric": "Une erreur s'est produite. Veuillez réessayer.",
    "errorGoogle": "Une erreur s'est produite avec l'inscription Google. Veuillez réessayer."
  },
  "features": {
    "title": "Des fonctionnalités puissantes pour maîtriser votre argent",
    "subtitle": "Tout ce dont vous avez besoin pour éliminer vos dettes, planifier vos finances et atteindre la liberté financière.",
    "f1Title": "Calculateur de remboursement de dettes",
    "f1Desc": "Comparez les stratégies Boule de neige et Avalanche côte à côte. Découvrez exactement combien de temps il vous faudra pour être libéré de vos dettes et combien d'intérêts vous paierez.",
    "f1B1": "Ajoutez un nombre illimité de dettes",
    "f1B2": "Suivez les taux d'intérêt",
    "f1B3": "Définissez des paiements supplémentaires",
    "f1B4": "Exportez des rapports comparatifs",
    "f2Title": "OCR et téléversement de factures",
    "f2Desc": "Prenez une photo de vos factures et notre IA extrait automatiquement le fournisseur, le montant et la date d'échéance. Ne saisissez plus jamais les informations manuellement.",
    "f2B1": "Photographiez vos factures",
    "f2B2": "Extraction automatique des données",
    "f2B3": "Score de confiance",
    "f2B4": "Corrections manuelles disponibles",
    "f3Title": "Tableau de bord financier",
    "f3Desc": "Visualisez toutes vos finances en un coup d'œil. Suivez vos dettes, factures, actifs et valeur nette avec de beaux graphiques et des calculs en temps réel.",
    "f3B1": "Indicateurs en temps réel",
    "f3B2": "Visualisations multiples",
    "f3B3": "Ratio dette/revenu",
    "f3B4": "Suivi de la valeur nette",
    "f4Title": "Recommandations IA (Premium)",
    "f4Desc": "Recevez des conseils financiers personnalisés grâce à l'IA. Découvrez des stratégies pour économiser, optimiser le remboursement de vos dettes et atteindre vos objectifs plus vite.",
    "f4B1": "Suggestions intelligentes",
    "f4B2": "Score d'impact",
    "f4B3": "Estimations d'économies",
    "f4B4": "Stratégies personnalisées",
    "whyChoose": "Pourquoi choisir Paycheck Planner ?",
    "fastSetupTitle": "⚡ Configuration rapide",
    "fastSetupDesc": "Démarrez en quelques minutes. Pas de formulaires compliqués ni d'intégration longue. Entrez simplement vos dettes et obtenez des informations instantanées.",
    "secureTitle": "🔒 Sécurisé et privé",
    "secureDesc": "Vos données financières sont chiffrées et protégées. Nous ne partageons jamais vos informations avec des tiers.",
    "availableTitle": "📱 Toujours disponible",
    "availableDesc": "Accédez à vos finances à tout moment, où que vous soyez. Design entièrement responsive sur mobile, tablette et ordinateur.",
    "ctaTitle": "Prêt à prendre le contrôle ?",
    "ctaSubtitle": "Commencez avec notre offre gratuite et mettez à niveau à tout moment pour débloquer les fonctionnalités premium.",
    "ctaButton": "Voir les offres et tarifs"
  }
}
'@ | ConvertFrom-Json
$existing_fr = Get-Content -Path "lib/i18n/messages/fr.json" -Raw | ConvertFrom-Json
$existing_fr | Add-Member -NotePropertyName "login" -NotePropertyValue $fragment_fr.login -Force
$existing_fr | Add-Member -NotePropertyName "signup" -NotePropertyValue $fragment_fr.signup -Force
$existing_fr | Add-Member -NotePropertyName "features" -NotePropertyValue $fragment_fr.features -Force
$existing_fr | ConvertTo-Json -Depth 10 | Set-Content -Path "lib/i18n/messages/fr.json" -Encoding UTF8
$check_fr = Get-Content -Path "lib/i18n/messages/fr.json" -Raw | ConvertFrom-Json
if ($check_fr.login.welcomeBack -and $check_fr.signup.createAccount -and $check_fr.features.title) { Write-Host "OK   lib/i18n/messages/fr.json" -ForegroundColor Green } else { Write-Host "FAIL lib/i18n/messages/fr.json" -ForegroundColor Red; $global:anyFail = $true }

$fragment_de = @'
{
  "login": {
    "welcomeBack": "Willkommen zurück",
    "welcomeBackSubtitle": "Übernehmen Sie die Kontrolle über jeden Gehaltsscheck, jede Schuld und jedes finanzielle Ziel.",
    "continueWithGoogle": "Mit Google fortfahren",
    "or": "oder",
    "emailPlaceholder": "E-Mail-Adresse",
    "passwordPlaceholder": "Passwort",
    "forgotPassword": "Passwort vergessen?",
    "logIn": "Anmelden",
    "loggingIn": "Anmeldung läuft...",
    "noAccount": "Noch kein Konto?",
    "signUpFree": "Kostenlos registrieren",
    "twoFactorTitle": "Zwei-Faktor-Verifizierung",
    "twoFactorSubtitle": "Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.",
    "verify": "Verifizieren",
    "verifying": "Wird überprüft...",
    "genericError": "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    "googleError": "Bei der Google-Anmeldung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
  },
  "signup": {
    "createAccount": "Konto erstellen",
    "createAccountSubtitle": "Schließen Sie sich Tausenden an, die ihre Finanzen im Griff haben",
    "agreeToTerms": "Ich stimme den",
    "termsOfService": "Nutzungsbedingungen",
    "and": "und der",
    "privacyPolicy": "Datenschutzrichtlinie",
    "continueWithGoogle": "Mit Google fortfahren",
    "or": "oder",
    "emailPlaceholder": "E-Mail-Adresse",
    "passwordPlaceholder": "Passwort (mind. 8 Zeichen)",
    "confirmPasswordPlaceholder": "Passwort bestätigen",
    "signUpFree": "Kostenlos registrieren",
    "creatingAccount": "Konto wird erstellt...",
    "alreadyHaveAccount": "Bereits ein Konto?",
    "logIn": "Anmelden",
    "errorAgreeTerms": "Bitte stimmen Sie den Nutzungsbedingungen und der Datenschutzrichtlinie zu, um fortzufahren.",
    "errorPasswordMismatch": "Die Passwörter stimmen nicht überein",
    "errorPasswordLength": "Das Passwort muss mindestens 8 Zeichen lang sein",
    "errorGeneric": "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    "errorGoogle": "Bei der Google-Registrierung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
  },
  "features": {
    "title": "Leistungsstarke Funktionen für Ihre Finanzen",
    "subtitle": "Alles, was Sie brauchen, um Schulden abzubauen, Ihre Finanzen zu planen und finanzielle Freiheit zu erreichen.",
    "f1Title": "Tilgungsrechner",
    "f1Desc": "Vergleichen Sie die Schneeball- und Lawinen-Tilgungsstrategien direkt nebeneinander. Sehen Sie genau, wie lange es dauert, schuldenfrei zu werden und wie viel Zinsen Sie zahlen.",
    "f1B1": "Unbegrenzt Schulden hinzufügen",
    "f1B2": "Zinssätze verfolgen",
    "f1B3": "Zusatzzahlungen festlegen",
    "f1B4": "Vergleichsberichte exportieren",
    "f2Title": "Rechnungs-OCR & Upload",
    "f2Desc": "Fotografieren Sie Ihre Rechnungen, und unsere KI extrahiert automatisch Anbieter, Betrag und Fälligkeitsdatum. Nie wieder manuelle Eingabe.",
    "f2B1": "Rechnungen fotografieren",
    "f2B2": "Automatische Datenextraktion",
    "f2B3": "Konfidenzbewertung",
    "f2B4": "Manuelle Korrekturen möglich",
    "f3Title": "Finanz-Dashboard",
    "f3Desc": "Sehen Sie Ihre gesamten Finanzen auf einen Blick. Verfolgen Sie Schulden, Rechnungen, Vermögenswerte und Nettovermögen mit übersichtlichen Diagrammen und Echtzeitberechnungen.",
    "f3B1": "Echtzeit-Kennzahlen",
    "f3B2": "Mehrere Visualisierungen",
    "f3B3": "Schulden-Einkommens-Verhältnis",
    "f3B4": "Nettovermögensverfolgung",
    "f4Title": "KI-Empfehlungen (Premium)",
    "f4Desc": "Erhalten Sie personalisierte Finanzberatung durch KI. Entdecken Sie Strategien, um Geld zu sparen, Ihre Tilgung zu optimieren und Ihre Ziele schneller zu erreichen.",
    "f4B1": "Intelligente Vorschläge",
    "f4B2": "Wirkungsbewertung",
    "f4B3": "Ersparnisschätzungen",
    "f4B4": "Personalisierte Strategien",
    "whyChoose": "Warum Paycheck Planner wählen?",
    "fastSetupTitle": "⚡ Schnelle Einrichtung",
    "fastSetupDesc": "Starten Sie in wenigen Minuten. Keine komplizierten Formulare oder langwierige Einführung. Geben Sie einfach Ihre Schulden ein und erhalten Sie sofort Einblicke.",
    "secureTitle": "🔒 Sicher & privat",
    "secureDesc": "Ihre Finanzdaten sind verschlüsselt und geschützt. Wir geben Ihre Informationen niemals an Dritte weiter.",
    "availableTitle": "📱 Immer verfügbar",
    "availableDesc": "Greifen Sie jederzeit und überall auf Ihre Finanzen zu. Vollständig responsives Design für Mobilgerät, Tablet und Desktop.",
    "ctaTitle": "Bereit, die Kontrolle zu übernehmen?",
    "ctaSubtitle": "Starten Sie mit unserem kostenlosen Plan und upgraden Sie jederzeit, um Premium-Funktionen freizuschalten.",
    "ctaButton": "Pläne & Preise ansehen"
  }
}
'@ | ConvertFrom-Json
$existing_de = Get-Content -Path "lib/i18n/messages/de.json" -Raw | ConvertFrom-Json
$existing_de | Add-Member -NotePropertyName "login" -NotePropertyValue $fragment_de.login -Force
$existing_de | Add-Member -NotePropertyName "signup" -NotePropertyValue $fragment_de.signup -Force
$existing_de | Add-Member -NotePropertyName "features" -NotePropertyValue $fragment_de.features -Force
$existing_de | ConvertTo-Json -Depth 10 | Set-Content -Path "lib/i18n/messages/de.json" -Encoding UTF8
$check_de = Get-Content -Path "lib/i18n/messages/de.json" -Raw | ConvertFrom-Json
if ($check_de.login.welcomeBack -and $check_de.signup.createAccount -and $check_de.features.title) { Write-Host "OK   lib/i18n/messages/de.json" -ForegroundColor Green } else { Write-Host "FAIL lib/i18n/messages/de.json" -ForegroundColor Red; $global:anyFail = $true }

$fragment_it = @'
{
  "login": {
    "welcomeBack": "Bentornato",
    "welcomeBackSubtitle": "Prendi il controllo di ogni stipendio, debito e obiettivo finanziario.",
    "continueWithGoogle": "Continua con Google",
    "or": "oppure",
    "emailPlaceholder": "Indirizzo email",
    "passwordPlaceholder": "Password",
    "forgotPassword": "Password dimenticata?",
    "logIn": "Accedi",
    "loggingIn": "Accesso in corso...",
    "noAccount": "Non hai un account?",
    "signUpFree": "Iscriviti gratis",
    "twoFactorTitle": "Verifica in due passaggi",
    "twoFactorSubtitle": "Inserisci il codice a 6 cifre dalla tua app di autenticazione.",
    "verify": "Verifica",
    "verifying": "Verifica in corso...",
    "genericError": "Si è verificato un errore. Riprova.",
    "googleError": "Si è verificato un errore con l'accesso Google. Riprova."
  },
  "signup": {
    "createAccount": "Crea account",
    "createAccountSubtitle": "Unisciti a migliaia di persone che gestiscono le proprie finanze",
    "agreeToTerms": "Accetto i",
    "termsOfService": "Termini di servizio",
    "and": "e la",
    "privacyPolicy": "Informativa sulla privacy",
    "continueWithGoogle": "Continua con Google",
    "or": "oppure",
    "emailPlaceholder": "Indirizzo email",
    "passwordPlaceholder": "Password (min. 8 caratteri)",
    "confirmPasswordPlaceholder": "Conferma password",
    "signUpFree": "Iscriviti gratis",
    "creatingAccount": "Creazione account...",
    "alreadyHaveAccount": "Hai già un account?",
    "logIn": "Accedi",
    "errorAgreeTerms": "Accetta i Termini di servizio e l'Informativa sulla privacy per continuare.",
    "errorPasswordMismatch": "Le password non corrispondono",
    "errorPasswordLength": "La password deve contenere almeno 8 caratteri",
    "errorGeneric": "Si è verificato un errore. Riprova.",
    "errorGoogle": "Si è verificato un errore con la registrazione Google. Riprova."
  },
  "features": {
    "title": "Funzionalità potenti per gestire il tuo denaro",
    "subtitle": "Tutto ciò di cui hai bisogno per eliminare i debiti, pianificare le tue finanze e raggiungere la libertà finanziaria.",
    "f1Title": "Calcolatore di estinzione debiti",
    "f1Desc": "Confronta le strategie Palla di neve e Valanga fianco a fianco. Scopri esattamente quanto tempo ci vorrà per essere libero dai debiti e quanti interessi pagherai.",
    "f1B1": "Aggiungi debiti illimitati",
    "f1B2": "Monitora i tassi di interesse",
    "f1B3": "Imposta pagamenti extra",
    "f1B4": "Esporta report di confronto",
    "f2Title": "OCR e caricamento bollette",
    "f2Desc": "Scatta una foto delle tue bollette e la nostra IA estrae automaticamente fornitore, importo e scadenza. Non inserire mai più i dati manualmente.",
    "f2B1": "Fotografa le bollette",
    "f2B2": "Estrazione automatica dei dati",
    "f2B3": "Punteggio di affidabilità",
    "f2B4": "Correzioni manuali disponibili",
    "f3Title": "Dashboard finanziaria",
    "f3Desc": "Visualizza tutte le tue finanze in un colpo d'occhio. Monitora debiti, bollette, patrimonio e valore netto con grafici chiari e calcoli in tempo reale.",
    "f3B1": "Metriche in tempo reale",
    "f3B2": "Visualizzazioni multiple",
    "f3B3": "Rapporto debito/reddito",
    "f3B4": "Monitoraggio del valore netto",
    "f4Title": "Raccomandazioni IA (Premium)",
    "f4Desc": "Ricevi consigli finanziari personalizzati basati sull'IA. Scopri strategie per risparmiare, ottimizzare l'estinzione dei debiti e raggiungere i tuoi obiettivi più velocemente.",
    "f4B1": "Suggerimenti intelligenti",
    "f4B2": "Punteggio d'impatto",
    "f4B3": "Stime di risparmio",
    "f4B4": "Strategie personalizzate",
    "whyChoose": "Perché scegliere Paycheck Planner?",
    "fastSetupTitle": "⚡ Configurazione rapida",
    "fastSetupDesc": "Inizia in pochi minuti. Nessun modulo complicato né onboarding lungo. Inserisci semplicemente i tuoi debiti e ottieni informazioni immediate.",
    "secureTitle": "🔒 Sicuro e privato",
    "secureDesc": "I tuoi dati finanziari sono crittografati e protetti. Non condividiamo mai le tue informazioni con terze parti.",
    "availableTitle": "📱 Sempre disponibile",
    "availableDesc": "Accedi alle tue finanze in qualsiasi momento e ovunque. Design completamente responsive su mobile, tablet e desktop.",
    "ctaTitle": "Pronto a prendere il controllo?",
    "ctaSubtitle": "Inizia con il nostro piano gratuito e aggiorna quando vuoi per sbloccare le funzionalità premium.",
    "ctaButton": "Vedi piani e prezzi"
  }
}
'@ | ConvertFrom-Json
$existing_it = Get-Content -Path "lib/i18n/messages/it.json" -Raw | ConvertFrom-Json
$existing_it | Add-Member -NotePropertyName "login" -NotePropertyValue $fragment_it.login -Force
$existing_it | Add-Member -NotePropertyName "signup" -NotePropertyValue $fragment_it.signup -Force
$existing_it | Add-Member -NotePropertyName "features" -NotePropertyValue $fragment_it.features -Force
$existing_it | ConvertTo-Json -Depth 10 | Set-Content -Path "lib/i18n/messages/it.json" -Encoding UTF8
$check_it = Get-Content -Path "lib/i18n/messages/it.json" -Raw | ConvertFrom-Json
if ($check_it.login.welcomeBack -and $check_it.signup.createAccount -and $check_it.features.title) { Write-Host "OK   lib/i18n/messages/it.json" -ForegroundColor Green } else { Write-Host "FAIL lib/i18n/messages/it.json" -ForegroundColor Red; $global:anyFail = $true }

$fragment_pl = @'
{
  "login": {
    "welcomeBack": "Witaj ponownie",
    "welcomeBackSubtitle": "Przejmij kontrolę nad każdą wypłatą, długiem i celem finansowym.",
    "continueWithGoogle": "Kontynuuj z Google",
    "or": "lub",
    "emailPlaceholder": "Adres e-mail",
    "passwordPlaceholder": "Hasło",
    "forgotPassword": "Nie pamiętasz hasła?",
    "logIn": "Zaloguj się",
    "loggingIn": "Logowanie...",
    "noAccount": "Nie masz konta?",
    "signUpFree": "Zarejestruj się za darmo",
    "twoFactorTitle": "Weryfikacja dwuetapowa",
    "twoFactorSubtitle": "Wprowadź 6-cyfrowy kod z aplikacji uwierzytelniającej.",
    "verify": "Zweryfikuj",
    "verifying": "Weryfikowanie...",
    "genericError": "Wystąpił błąd. Spróbuj ponownie.",
    "googleError": "Wystąpił błąd podczas logowania przez Google. Spróbuj ponownie."
  },
  "signup": {
    "createAccount": "Utwórz konto",
    "createAccountSubtitle": "Dołącz do tysięcy osób panujących nad swoimi finansami",
    "agreeToTerms": "Akceptuję",
    "termsOfService": "Warunki korzystania z usługi",
    "and": "oraz",
    "privacyPolicy": "Politykę prywatności",
    "continueWithGoogle": "Kontynuuj z Google",
    "or": "lub",
    "emailPlaceholder": "Adres e-mail",
    "passwordPlaceholder": "Hasło (min. 8 znaków)",
    "confirmPasswordPlaceholder": "Potwierdź hasło",
    "signUpFree": "Zarejestruj się za darmo",
    "creatingAccount": "Tworzenie konta...",
    "alreadyHaveAccount": "Masz już konto?",
    "logIn": "Zaloguj się",
    "errorAgreeTerms": "Zaakceptuj Warunki korzystania z usługi i Politykę prywatności, aby kontynuować.",
    "errorPasswordMismatch": "Hasła nie są zgodne",
    "errorPasswordLength": "Hasło musi mieć co najmniej 8 znaków",
    "errorGeneric": "Wystąpił błąd. Spróbuj ponownie.",
    "errorGoogle": "Wystąpił błąd podczas rejestracji przez Google. Spróbuj ponownie."
  },
  "features": {
    "title": "Zaawansowane funkcje, by zapanować nad pieniędzmi",
    "subtitle": "Wszystko, czego potrzebujesz, aby spłacić długi, zaplanować finanse i osiągnąć wolność finansową.",
    "f1Title": "Kalkulator spłaty długu",
    "f1Desc": "Porównaj strategie Kuli śnieżnej i Lawiny obok siebie. Zobacz dokładnie, ile czasu zajmie uwolnienie się od długów i ile zapłacisz odsetek.",
    "f1B1": "Dodawaj nieograniczoną liczbę długów",
    "f1B2": "Śledź oprocentowanie",
    "f1B3": "Ustaw dodatkowe wpłaty",
    "f1B4": "Eksportuj raporty porównawcze",
    "f2Title": "OCR i wgrywanie rachunków",
    "f2Desc": "Zrób zdjęcie rachunku, a nasza AI automatycznie wyciągnie dostawcę, kwotę i termin płatności. Nigdy więcej ręcznego wpisywania danych.",
    "f2B1": "Fotografuj rachunki",
    "f2B2": "Automatyczne wyciąganie danych",
    "f2B3": "Ocena pewności",
    "f2B4": "Dostępne ręczne poprawki",
    "f3Title": "Panel finansowy",
    "f3Desc": "Zobacz wszystkie swoje finanse na jednym ekranie. Śledź długi, rachunki, aktywa i wartość netto dzięki czytelnym wykresom i obliczeniom w czasie rzeczywistym.",
    "f3B1": "Wskaźniki w czasie rzeczywistym",
    "f3B2": "Wiele wizualizacji",
    "f3B3": "Stosunek długu do dochodu",
    "f3B4": "Śledzenie wartości netto",
    "f4Title": "Rekomendacje AI (Premium)",
    "f4Desc": "Otrzymuj spersonalizowane porady finansowe oparte na AI. Odkryj strategie oszczędzania, optymalizacji spłaty długów i szybszego osiągania celów.",
    "f4B1": "Inteligentne sugestie",
    "f4B2": "Ocena wpływu",
    "f4B3": "Szacunki oszczędności",
    "f4B4": "Spersonalizowane strategie",
    "whyChoose": "Dlaczego warto wybrać Paycheck Planner?",
    "fastSetupTitle": "⚡ Szybka konfiguracja",
    "fastSetupDesc": "Zacznij w kilka minut. Bez skomplikowanych formularzy i długiego wdrażania. Po prostu wpisz swoje długi i uzyskaj natychmiastowe informacje.",
    "secureTitle": "🔒 Bezpiecznie i prywatnie",
    "secureDesc": "Twoje dane finansowe są szyfrowane i chronione. Nigdy nie udostępniamy Twoich informacji stronom trzecim.",
    "availableTitle": "📱 Zawsze dostępne",
    "availableDesc": "Uzyskaj dostęp do swoich finansów w dowolnym miejscu i czasie. W pełni responsywny design na telefonie, tablecie i komputerze.",
    "ctaTitle": "Gotowy przejąć kontrolę?",
    "ctaSubtitle": "Zacznij od naszego darmowego planu i ulepszaj w dowolnym momencie, aby odblokować funkcje premium.",
    "ctaButton": "Zobacz plany i cennik"
  }
}
'@ | ConvertFrom-Json
$existing_pl = Get-Content -Path "lib/i18n/messages/pl.json" -Raw | ConvertFrom-Json
$existing_pl | Add-Member -NotePropertyName "login" -NotePropertyValue $fragment_pl.login -Force
$existing_pl | Add-Member -NotePropertyName "signup" -NotePropertyValue $fragment_pl.signup -Force
$existing_pl | Add-Member -NotePropertyName "features" -NotePropertyValue $fragment_pl.features -Force
$existing_pl | ConvertTo-Json -Depth 10 | Set-Content -Path "lib/i18n/messages/pl.json" -Encoding UTF8
$check_pl = Get-Content -Path "lib/i18n/messages/pl.json" -Raw | ConvertFrom-Json
if ($check_pl.login.welcomeBack -and $check_pl.signup.createAccount -and $check_pl.features.title) { Write-Host "OK   lib/i18n/messages/pl.json" -ForegroundColor Green } else { Write-Host "FAIL lib/i18n/messages/pl.json" -ForegroundColor Red; $global:anyFail = $true }

$fragment_is = @'
{
  "login": {
    "welcomeBack": "Velkomin/n aftur",
    "welcomeBackSubtitle": "Taktu stjórn á hverri útborgun, skuld og fjárhagslegu markmiði.",
    "continueWithGoogle": "Halda áfram með Google",
    "or": "eða",
    "emailPlaceholder": "Netfang",
    "passwordPlaceholder": "Lykilorð",
    "forgotPassword": "Gleymt lykilorð?",
    "logIn": "Skrá inn",
    "loggingIn": "Skrái inn...",
    "noAccount": "Ertu ekki með aðgang?",
    "signUpFree": "Nýskrá frítt",
    "twoFactorTitle": "Tveggja þátta staðfesting",
    "twoFactorSubtitle": "Sláðu inn 6 stafa kóðann úr auðkenningarappinu þínu.",
    "verify": "Staðfesta",
    "verifying": "Staðfesti...",
    "genericError": "Villa kom upp. Reyndu aftur.",
    "googleError": "Villa kom upp við innskráningu með Google. Reyndu aftur."
  },
  "signup": {
    "createAccount": "Stofna aðgang",
    "createAccountSubtitle": "Slástu í hóp þúsunda sem stjórna fjármálum sínum",
    "agreeToTerms": "Ég samþykki",
    "termsOfService": "þjónustuskilmála",
    "and": "og",
    "privacyPolicy": "persónuverndarstefnu",
    "continueWithGoogle": "Halda áfram með Google",
    "or": "eða",
    "emailPlaceholder": "Netfang",
    "passwordPlaceholder": "Lykilorð (minnst 8 stafir)",
    "confirmPasswordPlaceholder": "Staðfestu lykilorð",
    "signUpFree": "Nýskrá frítt",
    "creatingAccount": "Stofna aðgang...",
    "alreadyHaveAccount": "Ertu nú þegar með aðgang?",
    "logIn": "Skrá inn",
    "errorAgreeTerms": "Samþykktu þjónustuskilmála og persónuverndarstefnu til að halda áfram.",
    "errorPasswordMismatch": "Lykilorðin passa ekki saman",
    "errorPasswordLength": "Lykilorðið verður að vera minnst 8 stafir",
    "errorGeneric": "Villa kom upp. Reyndu aftur.",
    "errorGoogle": "Villa kom upp við nýskráningu með Google. Reyndu aftur."
  },
  "features": {
    "title": "Öflugir eiginleikar til að ná tökum á fjármálum þínum",
    "subtitle": "Allt sem þú þarft til að losna við skuldir, skipuleggja fjármálin þín og ná fjárhagslegu frelsi.",
    "f1Title": "Skuldaútreikningsvél",
    "f1Desc": "Berðu saman Snjóbolta- og Snjóflóðsaðferðirnar hlið við hlið. Sjáðu nákvæmlega hversu langan tíma það tekur að losna við skuldir og hversu miklum vöxtum þú munt greiða.",
    "f1B1": "Bættu við ótakmörkuðum fjölda skulda",
    "f1B2": "Fylgstu með vöxtum",
    "f1B3": "Stilltu aukagreiðslur",
    "f1B4": "Flyttu út samanburðarskýrslur",
    "f2Title": "OCR og reikningaupphal",
    "f2Desc": "Taktu mynd af reikningunum þínum og gervigreindin okkar dregur sjálfkrafa út söluaðila, upphæð og gjalddaga. Aldrei aftur handvirk innsláttur.",
    "f2B1": "Taktu myndir af reikningum",
    "f2B2": "Sjálfvirk gagnaútdráttur",
    "f2B3": "Áreiðanleikaeinkunn",
    "f2B4": "Handvirkar leiðréttingar í boði",
    "f3Title": "Fjármálamælaborð",
    "f3Desc": "Sjáðu öll fjármál þín í einu. Fylgstu með skuldum, reikningum, eignum og hreinni eign með fallegum gröfum og útreikningum í rauntíma.",
    "f3B1": "Rauntímamælikvarðar",
    "f3B2": "Margvíslegar sjónrænar birtingar",
    "f3B3": "Skuldir á móti tekjum",
    "f3B4": "Eftirfylgni hreinnar eignar",
    "f4Title": "Gervigreindartilmæli (Premium)",
    "f4Desc": "Fáðu persónulega fjármálaráðgjöf knúna gervigreind. Uppgötvaðu aðferðir til að spara peninga, hámarka skuldaniðurgreiðslu og ná markmiðum þínum hraðar.",
    "f4B1": "Snjallar tillögur",
    "f4B2": "Áhrifaeinkunn",
    "f4B3": "Sparnaðaráætlanir",
    "f4B4": "Persónulegar aðferðir",
    "whyChoose": "Af hverju að velja Paycheck Planner?",
    "fastSetupTitle": "⚡ Fljótleg uppsetning",
    "fastSetupDesc": "Byrjaðu á nokkrum mínútum. Engin flókin eyðublöð eða löng innleiðing. Sláðu bara inn skuldirnar þínar og fáðu samstundis innsýn.",
    "secureTitle": "🔒 Öruggt og einkarekið",
    "secureDesc": "Fjármálagögnin þín eru dulkóðuð og vernduð. Við deilum aldrei upplýsingum þínum með þriðja aðila.",
    "availableTitle": "📱 Alltaf aðgengilegt",
    "availableDesc": "Fáðu aðgang að fjármálum þínum hvenær og hvar sem er. Fullkomlega sniðið hönnun fyrir síma, spjaldtölvu og borðtölvu.",
    "ctaTitle": "Tilbúin(n) að taka stjórnina?",
    "ctaSubtitle": "Byrjaðu með frítt áskrift okkar og uppfærðu hvenær sem er til að opna hágæða eiginleika.",
    "ctaButton": "Skoða áskriftir og verð"
  }
}
'@ | ConvertFrom-Json
$existing_is = Get-Content -Path "lib/i18n/messages/is.json" -Raw | ConvertFrom-Json
$existing_is | Add-Member -NotePropertyName "login" -NotePropertyValue $fragment_is.login -Force
$existing_is | Add-Member -NotePropertyName "signup" -NotePropertyValue $fragment_is.signup -Force
$existing_is | Add-Member -NotePropertyName "features" -NotePropertyValue $fragment_is.features -Force
$existing_is | ConvertTo-Json -Depth 10 | Set-Content -Path "lib/i18n/messages/is.json" -Encoding UTF8
$check_is = Get-Content -Path "lib/i18n/messages/is.json" -Raw | ConvertFrom-Json
if ($check_is.login.welcomeBack -and $check_is.signup.createAccount -and $check_is.features.title) { Write-Host "OK   lib/i18n/messages/is.json" -ForegroundColor Green } else { Write-Host "FAIL lib/i18n/messages/is.json" -ForegroundColor Red; $global:anyFail = $true }

if ($global:anyFail) {
    Write-Host ""
    Write-Host "One or more files failed verification. Stopping before commit." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "All files written and verified. Committing..." -ForegroundColor Cyan

git add app/login/page.tsx app/signup/page.tsx app/features/page.tsx lib/i18n/messages/en.json lib/i18n/messages/es.json lib/i18n/messages/fr.json lib/i18n/messages/de.json lib/i18n/messages/it.json lib/i18n/messages/pl.json lib/i18n/messages/is.json
git commit -m "Translate login, signup, and features pages"
git push origin main

Write-Host ""
Write-Host "Done. Vercel will auto-deploy in a minute or two." -ForegroundColor Green