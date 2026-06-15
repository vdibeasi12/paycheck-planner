"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { isNativeApp } from "@/lib/platform"

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleGoogleSignup = async () => {
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
      setError("An error occurred with Google sign-in. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
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
      setError("An error occurred. Please try again.")
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

        <h2 className="text-2xl font-bold mb-2">Create Account</h2>
        <p className="text-gray-400 text-sm mb-6">Join thousands taking control of their finances</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded text-sm mb-4">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full border border-gray-700 bg-[#1a233a] hover:bg-[#2a3f5f] rounded-lg py-3 px-4 flex items-center justify-center gap-3 transition disabled:opacity-50">
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

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            className="w-full bg-[#1a233a] border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password (min 8 characters)"
            className="w-full bg-[#1a233a] border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirm password"
            className="w-full bg-[#1a233a] border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading || !email || !password || !confirmPassword}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-semibold py-3 rounded transition"
          >
            {loading ? "Creating Account..." : "Sign Up Free"}
          </button>
        </form>

        <div className="border-t border-gray-700 mt-6 pt-6 text-center text-sm">
          <p className="text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-green-500 hover:text-green-400 font-semibold">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
