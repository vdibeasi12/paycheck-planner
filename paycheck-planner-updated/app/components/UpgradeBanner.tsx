"use client"

type Props = {
  show: boolean
  monthlyLoss?: number
}

export default function UpgradeBanner({ show, monthlyLoss = 0 }: Props) {
  if (!show) return null

  return (
    <div className="sticky top-0 z-50 bg-emerald-500 text-black px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        <p className="text-sm font-semibold">
          You're losing ${monthlyLoss.toFixed(0)}/month in interest
        </p>

        <button
          onClick={() => (window.location.href = "/api/checkout")}
          className="bg-black text-white px-4 py-1 rounded-lg text-sm font-semibold"
        >
          Stop the Leak
        </button>

      </div>
    </div>
  )
}