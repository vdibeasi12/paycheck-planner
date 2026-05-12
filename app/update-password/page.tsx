"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function UpdatePassword() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState("")

  const handleUpdate = async () => {
    await supabase.auth.updateUser({ password })
    router.push("/dashboard")
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded w-full max-w-md">

        <img
          src="/logo.png"
          alt="Paycheck Planner"
          style={{ height: "64px", margin: "0 auto 20px" }}
        />

        <input
          type="password"
          placeholder="New password"
          className="w-full border p-2 mb-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleUpdate}
          className="w-full bg-black text-white py-2 rounded"
        >
          Update Password
        </button>
      </div>
    </div>
  )
}