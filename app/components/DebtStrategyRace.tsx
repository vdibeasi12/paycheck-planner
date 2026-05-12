import { canUseSnowball } from "@/lib/permissions"

export default function DebtStrategyRace({ plan }: { plan: string }) {
  // 🔒 HARD LOCK
  if (!canUseSnowball(plan)) {
    return (
      <div className="p-6 text-center">
        <div className="bg-[#0f172a] border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">
            🔒 Premium Feature
          </h2>

          <p className="text-gray-400 mb-4">
            Snowball & Avalanche strategies are available on Premium.
          </p>

          <a
            href="/pricing"
            className="inline-block bg-green-500 hover:bg-green-600 text-black px-4 py-2 rounded-lg"
          >
            Upgrade to Premium
          </a>
        </div>
      </div>
    )
  }

  // ✅ REAL FEATURE (only premium reaches here)
  return (
    <div>
      {/* YOUR EXISTING SNOWBALL LOGIC */}
    </div>
  )
}