"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function UpdatePassword() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

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
      // The recovery link establishes a session; updateUser sets the new password.
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) {
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

        <h2 className="text-2xl font-bold mb-2">Set a new password</h2>
        <p className="text-gray-400 text-sm mb-6">Choose a strong password you don&apos;t use elsewhere.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded text-sm mb-4">
            {error}
          </div>
        )}

        {done ? (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded text-sm">
            Password updated. Redirecting…
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
      </div>
    </div>
  )
}
