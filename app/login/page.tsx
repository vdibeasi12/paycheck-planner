"use client"

import { Suspense, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { isNativeApp } from "@/lib/platform"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get("message")

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
      setError("An error occurred. Please try again.")
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
          redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
        },
      })
      if (oauthError) setError(oauthError.message)
    } catch {
      setError("An error occurred with Google sign-in. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center px-6">
      <div className="bg-[#0f172a] border border-gray-800 p-8 rounded-lg w-full max-w-md">
        <Link href="/" className="flex justify-center mb-6">
          <img src="/logo.png" alt="Paycheck Planner" style={{ height: "48px" }} />
        </Link>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded text-sm mb-4">
            {error}
          </div>
        )}

        {mfaRequired ? (
          /* ---- MFA challenge ---- */
          <>
            <h2 className="text-2xl font-bold mb-2">Two-factor verification</h2>
            <p className="text-gray-400 text-sm mb-6">
              Enter the 6-digit code from your authenticator app.
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
                {loading ? "Verifying..." : "Verify"}
              </button>
            </form>
          </>
        ) : (
          /* ---- Email + Google sign-in ---- */
          <>
            <h2 className="text-2xl font-bold mb-2">Welcome Back</h2>
            <p className="text-gray-400 text-sm mb-6">
              Take control of every paycheck, debt, and financial goal.
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
              <span className="text-white font-medium">Continue with Google</span>
            </button>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-700"></div>
              <span className="text-gray-500 text-sm">or</span>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                placeholder="Email address"
                className="w-full bg-[#1a233a] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full bg-[#1a233a] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm text-green-500 hover:text-green-400 transition">
                  Forgot Password?
                </Link>
              </div>
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-semibold py-3 rounded-lg transition"
              >
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>

            <div className="border-t border-gray-700 mt-6 pt-6 text-center text-sm">
              <p className="text-gray-400">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-green-500 hover:text-green-400 font-semibold">
                  Sign Up Free
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
