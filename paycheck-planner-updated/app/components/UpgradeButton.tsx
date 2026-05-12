"use client"

export default function UpgradeButton() {
  const handleUpgrade = async () => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
    })

    const data = await res.json()
    window.location.href = data.url
  }

  return (
    <button
      onClick={handleUpgrade}
      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
    >
      Upgrade to Pro
    </button>
  )
}