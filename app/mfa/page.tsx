"use client"

import { Suspense, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useSearchParams } from "next/navigation"

// Only allow same-origin relative redirects (prevents open-redirect abuse).
function safeRedirect(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw
  }
  return "/dashboard"
}

function MfaChallenge() {
  const searchParams = useSearchParams()
  const redirectTo = safeRedirect(searchParams.get("redirectTo"))

  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        // Already stepped up to aal2? Nothing to do here; move along.
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aal?.currentLevel === "aal2") {
          window.location.assign(redirectTo)
          return
        }

        const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors()
        if (fErr) {
          if (active) setError(fErr.message)
          return
        }

        const totp =
          factors?.totp?.find((f) => f.status === "verified") || factors?.totp?.[0]
        if (!totp) {
          // No verified factor to challenge against; don't trap the user here.
          window.location.assign(redirectTo)
          return
        }

        if (active) {
          setFactorId(totp.id)
          setReady(true)
        }
      } catch {
        if (active) setError("Could not start verification. Please try again.")
      }
    })()
    return () => {
      active = false
    }
  }, [redirectTo])

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId || code.length < 6) return
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
        code,
      })
      if (vErr) {
        setError(vErr.message)
        return
      }
      // Session is now aal2. Full navigation so middleware sees the elevated cookie.
      window.location.assign(redirectTo)
    } catch {
      setError("Verification failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.assign("/login")
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center px-6">
      <div className="bg-[#0f172a] border border-gray-800 p-8 rounded-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Paycheck Planner" style={{ height: "48px" }} />
        </div>

        <h2 className="text-2xl font-bold mb-2">Two-factor verification</h2>
        <p className="text-gray-400 text-sm mb-6">
          Enter the 6-digit code from your authenticator app to finish signing in.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={verify} className="space-y-4">
          <input
            inputMode="numeric"
            autoFocus
            placeholder="123456"
            disabled={!ready || loading}
            className="w-full bg-[#1a233a] border border-gray-700 rounded-lg px-4 py-3 text-center text-xl tracking-[0.4em] text-white placeholder-gray-600 focus:outline-none focus:border-green-500 disabled:opacity-50"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          <button
            type="submit"
            disabled={!ready || loading || code.length < 6}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-semibold py-3 rounded-lg transition"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>

        <div className="border-t border-gray-700 mt-6 pt-6 text-center text-sm">
          <button onClick={signOut} className="text-gray-400 hover:text-white transition">
            Sign in with a different account
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MfaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <MfaChallenge />
    </Suspense>
  )
}
