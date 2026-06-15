"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/update-password`,
      })

      if (resetError) {
        setError(resetError.message)
      } else {
        setSent(true)
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

        {sent ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
            <p className="text-gray-400 mb-6">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-500">
              Didn't receive it? Check your spam folder or{' '}
              <button 
                onClick={() => { setSent(false); setEmail(""); setError(""); }}
                className="text-green-500 hover:text-green-400"
              >
                try again
              </button>
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Forgot Password?</h2>
              <p className="text-gray-400 text-sm mb-6">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded text-sm">
                {error}
              </div>
            )}

            <input
              type="email"
              placeholder="Enter your email"
              className="w-full bg-[#1a233a] border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-semibold py-3 rounded transition"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <div className="text-center text-sm">
              <Link href="/login" className="text-gray-400 hover:text-white">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}