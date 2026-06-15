"use client"

type Props = {
  isSubscribed: boolean
  children: React.ReactNode
}

export default function PremiumGate({ isSubscribed, children }: Props) {
  if (isSubscribed) return <>{children}</>

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
      
      <h3 className="text-lg font-semibold mb-2">
        Premium Feature
      </h3>

      <p className="text-sm text-slate-400 mb-4">
        Unlock advanced insights, payoff strategies, and your optimized plan.
      </p>

      <button
        onClick={() => (window.location.href = "/api/checkout")}
        className="bg-emerald-500 text-black px-4 py-2 rounded-lg font-semibold"
      >
        Upgrade Now
      </button>

    </div>
  )
}