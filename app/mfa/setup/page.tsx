"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import MfaSetup from "@/components/MfaSetup"

// Only allow same-origin relative redirects (prevents open-redirect abuse).
function safeRedirect(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw
  }
  return "/dashboard"
}

function MfaSetupRequired() {
  const searchParams = useSearchParams()
  const redirectTo = safeRedirect(searchParams.get("redirectTo"))

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.assign("/login")
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center px-6 py-12">
      <div className="bg-[#0f172a] border border-gray-800 p-8 rounded-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Paycheck Planner" style={{ height: "48px" }} />
        </div>

        <h2 className="text-2xl font-bold mb-2">Set up two-factor authentication</h2>
        <p className="text-gray-400 text-sm mb-6">
          For the security of your financial data, Paycheck Planner requires
          two-factor authentication on every account. Set it up below to continue.
        </p>

        <MfaSetup onVerified={() => window.location.assign(redirectTo)} />

        <div className="border-t border-gray-700 mt-6 pt-6 text-center text-sm">
          <button onClick={signOut} className="text-gray-400 hover:text-white transition">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MfaSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <MfaSetupRequired />
    </Suspense>
  )
}
