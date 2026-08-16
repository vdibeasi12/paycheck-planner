"use client"

import { Suspense, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useSearchParams } from "next/navigation"
import { safeRedirect } from "@/lib/safeRedirect"
import { Loader2, Mail, ShieldPlus } from "lucide-react"

function MfaChallenge() {
  const searchParams = useSearchParams()
  const redirectTo = safeRedirect(searchParams.get("redirectTo"))

  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  // QA fix (Aug 16 2026): "I still want the MFA screen to show the
  // authenticator and have an option to use email and get a code as a
  // secondary option for both web and app." Previously this page silently
  // POSTed to /api/mfa/email/send on every load and only switched into
  // email mode if that happened to succeed -- there was never a visible
  // choice, and a user with an authenticator-only factor never saw email
  // mentioned at all. The backend (lib/mfaEmail.ts, /api/mfa/email/send,
  // built when the user set this up via app/components/MfaSetup.tsx) was
  // already there and already returns a clean { sent: false } when no email
  // backup is on file for the account -- this page now just asks for it
  // explicitly, on demand, and shows both states honestly instead of
  // guessing silently. This is the same page whether it's opened in a
  // browser or inside the Android app's WebView (see
  // app/components/NativeInit.tsx), so one fix covers both.
  const [mode, setMode] = useState<"app" | "email">("app")
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{ kind: "sent" | "unavailable" | "error"; message: string } | null>(
    null
  )

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

  async function requestEmailCode() {
    if (!factorId || sendingEmail) return
    setError("")
    setEmailStatus(null)
    setSendingEmail(true)
    try {
      const res = await fetch("/api/mfa/email/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ factorId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setEmailStatus({ kind: "error", message: body?.error || "Could not send the code. Please try again." })
        return
      }
      if (body?.sent) {
        setMode("email")
        setCode("")
        setEmailStatus({ kind: "sent", message: "We emailed a 6-digit code -- enter it below." })
      } else {
        // This account never set up email delivery for its authenticator
        // factor (see app/components/MfaSetup.tsx's "Email me a code
        // instead" enrollment option) -- say so plainly instead of leaving
        // the button appearing to do nothing.
        setEmailStatus({
          kind: "unavailable",
          message: "Email backup isn't set up for this account yet. Use your authenticator app for now -- you can add email backup from Settings afterward.",
        })
      }
    } catch {
      setEmailStatus({ kind: "error", message: "Could not reach the server. Please check your connection and try again." })
    } finally {
      setSendingEmail(false)
    }
  }

  function useAuthenticatorInstead() {
    setMode("app")
    setCode("")
    setEmailStatus(null)
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center px-6">
      <div className="bg-[#0f172a] border border-gray-800 p-8 rounded-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Paycheck Planner" style={{ height: "48px" }} />
        </div>

        <h2 className="text-2xl font-bold mb-2">Two-factor verification</h2>
        <p className="text-gray-400 text-sm mb-6">
          {mode === "email"
            ? "Enter the 6-digit code we emailed you to finish signing in."
            : "Enter the 6-digit code from your authenticator app to finish signing in."}
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

        {/* The secondary option, always visible -- per the ask, this isn't
            something the app silently decides for the user. */}
        <div className="mt-4 text-center">
          {mode === "app" ? (
            <button
              type="button"
              onClick={requestEmailCode}
              disabled={!ready || sendingEmail}
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition disabled:opacity-60"
            >
              {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              {sendingEmail ? "Sending..." : "Don't have your authenticator? Email me a code instead"}
            </button>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={requestEmailCode}
                disabled={sendingEmail}
                className="text-sm text-gray-400 hover:text-white transition disabled:opacity-60"
              >
                {sendingEmail ? "Sending..." : "Resend code"}
              </button>
              <div>
                <button
                  type="button"
                  onClick={useAuthenticatorInstead}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition"
                >
                  <ShieldPlus size={14} /> Use my authenticator app instead
                </button>
              </div>
            </div>
          )}

          {emailStatus && (
            <p
              className={`mt-2 text-xs ${
                emailStatus.kind === "sent"
                  ? "text-emerald-400"
                  : emailStatus.kind === "unavailable"
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {emailStatus.message}
            </p>
          )}
        </div>

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
