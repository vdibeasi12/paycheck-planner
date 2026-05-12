"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function SignupPage() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (!email || !password) {
        setError("Please fill in all fields")
        setLoading(false)
        return
      }

      const { error: signupError, data } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signupError) {
        setError(signupError.message)
      } else {
        // Send confirmation email via our email service
        try {
          const response = await fetch('/api/email/send-confirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              userId: data?.user?.id,
            }),
          })

          if (response.ok) {
            setSuccess(true)
            setTimeout(() => {
              router.push("/login")
            }, 3000)
          } else {
            // Email failed but account was created, still redirect
            setSuccess(true)
            setTimeout(() => {
              router.push("/login")
            }, 3000)
          }
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError)
          // Account created, still redirect even if email failed
          setSuccess(true)
          setTimeout(() => {
            router.push("/login")
          }, 3000)
        }
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src="/logo.png" alt="Paycheck Planner" className="h-12 w-auto" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2 text-center">
            Create Account
          </h1>
          <p className="text-slate-400 text-center mb-8">
            Start your journey to financial freedom
          </p>

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
              <p className="text-green-400 text-sm">
                ✅ Account created! Check your email for a confirmation link. Redirecting to login...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                required
                disabled={loading || success}
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                required
                disabled={loading || success}
              />
              <p className="text-xs text-slate-400 mt-2">
                At least 8 characters recommended
              </p>
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/50 mt-6"
            >
              {loading ? "Creating Account..." : success ? "Account Created! 🎉" : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800/50 text-slate-400">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Login Link */}
          <Link
            href="/login"
            className="block w-full text-center py-3 border border-slate-600 hover:border-green-500 text-slate-300 hover:text-white font-semibold rounded-lg transition-all duration-200"
          >
            Sign In Instead
          </Link>

          {/* Privacy Notice */}
          <p className="text-xs text-slate-400 text-center mt-6">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-green-400 hover:text-green-300">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-green-400 hover:text-green-300">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}