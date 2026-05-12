"use client"

import { generateReferralCode } from "@/lib/referral"

export default function ReferralCard({ user }: { user: any }) {
  const code = generateReferralCode(user.id)

  const link = `${window.location.origin}/signup?ref=${code}`

  const copy = () => {
    navigator.clipboard.writeText(link)
    alert("Copied!")
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h2 className="font-semibold mb-2">Refer & Earn</h2>

      <p className="text-gray-500 mb-4">
        Invite friends and earn rewards.
      </p>

      <div className="flex gap-2">
        <input
          value={link}
          readOnly
          className="border p-2 rounded w-full"
        />

        <button
          onClick={copy}
          className="bg-black text-white px-4 rounded"
        >
          Copy
        </button>
      </div>
    </div>
  )
}