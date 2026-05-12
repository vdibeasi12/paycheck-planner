"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function Step4Auth() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (!error) {
      router.push("/dashboard")
    } else {
      alert(error.message)
    }
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="bg-white text-black rounded-xl p-8 w-full max-w-md">

      <h2 className="text-xl font-bold mb-4 text-center">
        Create your account
      </h2>

      <input
        placeholder="Email"
        className="w-full border p-3 rounded mb-3"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        placeholder="Password"
        type="password"
        className="w-full border p-3 rounded mb-4"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={handleSignup}
        className="w-full bg-black text-white py-3 rounded mb-3"
      >
        Create Account
      </button>

      <button
        onClick={handleGoogle}
        className="w-full bg-red-500 text-white py-3 rounded"
      >
        Continue with Google
      </button>
    </div>
  )
}