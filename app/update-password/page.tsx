"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"

// "checking" while we confirm the recovery link established a session,
// "valid" once it has, "invalid" if the link was missing/expired/used or was
// opened in a different browser than it was requested from (PKCE mismatch).
type LinkState = "checking" | "valid" | "invalid"

export default function UpdatePassword() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [linkState, setLinkState] = useState<LinkState>("checking")

  // Confirm a recovery session exists BEFORE showing the form, so an expired or
  // invalid link shows a clear message instead of letting the user fill in a
  // new password only to hit "Auth session missing" on submit. The browser
  // client exchanges the recovery code/hash for a session on load
  // (detectSessionInUrl); PASSWORD_RECOVERY fires when that succeeds.
  useEffect(() => {
    let active = true

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === "PASSWORD_RECOVERY" || session) setLinkState("valid")
    })

    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      if (data.session) {
        setLinkState("valid")
        return
      }
      // The auth listener may not have fired yet; give the in-URL code exchange
      // a moment to complete, then make a final determination.
      setTimeout(async () => {
        if (!active) return
        const { data: again } = await supabase.auth.getSession()
        if (!active) return
        setLinkState(again.session ? "valid" : "invalid")
      }, 1500)
    })()

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setLoading(true)
    try {
      // The recovery link established a session; updateUser sets the new password.
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) {
        // A session that lapsed between page load and submit lands here too.
        setError(updErr.message)
        return
      }
      setDone(true)
      setTimeout(() => router.push("/dashboard"), 1200)
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

        {linkState === "checking" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="animate-spin text-gray-400" />
            <p className="text-sm text-gray-400">Verifying your reset link...</p>
          </div>
        )}

        {linkState === "invalid" && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-3">Link expired or invalid</h2>
            <p className="text-gray-400 text-sm mb-6">
              This password reset link is no longer valid. Reset links expire after a
              while and can only be used once. Please request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3 rounded-lg transition"
            >
              Request a new link
            </Link>
            <div className="mt-4 text-sm">
              <Link href="/login" className="text-gray-400 hover:text-white">
                Back to Login
              </Link>
            </div>
          </div>
        )}

        {linkState === "valid" && (
          <>
            <h2 className="text-2xl font-bold mb-2">Set a new password</h2>
            <p className="text-gray-400 text-sm mb-6">Choose a strong password you don&apos;t use elsewhere.</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded text-sm mb-4">
                {error}
              </div>
            )}

            {done ? (
              <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded text-sm">
                Password updated. Redirecting...
              </div>
            ) : (
              <form onSubmit={handleUpdate} className="space-y-4">
                <input
                  type="password"
                  placeholder="New password"
                  className="w-full bg-[#1a233a] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="w-full bg-[#1a233a] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-black font-semibold py-3 rounded-lg transition"
                >
                  {loading ? "Updating..." : "Update password"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}