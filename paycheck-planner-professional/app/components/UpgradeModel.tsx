"use client"

import { useState } from "react"

export default function UpgradeModal({ email }: { email: string }) {
  const [open, setOpen] = useState(false)

  async function handleUpgrade() {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ email }),
    })

    const data = await res.json()
    window.location.href = data.url
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-green-600 text-white px-4 py-2 rounded-lg"
      >
        Upgrade
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl max-w-md w-full shadow-xl">
            <h2 className="text-2xl font-bold mb-4">
              Unlock Full Paycheck Planner
            </h2>

            <p className="text-gray-600 mb-6">
              Get full access, debt payoff tools, and smarter insights.
            </p>

            <button
              onClick={handleUpgrade}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold"
            >
              Start Free Trial (7 Days)
            </button>

            <button
              onClick={() => setOpen(false)}
              className="mt-3 text-sm text-gray-500 w-full"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </>
  )
}