'use client'

import { useState, useEffect } from 'react'
import { Brain, TrendingDown, Zap, Award, ChevronRight, MessageSquare } from 'lucide-react'
import Link from 'next/link'

interface Recommendation {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  category: 'debt' | 'savings' | 'strategy' | 'lifestyle'
  estimatedSavings?: number
  timeframe?: string
  icon: React.ReactNode
}

export default function AIRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [activeCategory, setActiveCategory] = useState<'all' | 'debt' | 'savings' | 'strategy' | 'lifestyle'>('all')
  const [loading, setLoading] = useState(true)
  const [userStats, setUserStats] = useState({
    totalDebt: 45000,
    monthlyIncome: 5000,
    monthlyExpenses: 2500,
    debtToIncomeRatio: 9,
  })

  useEffect(() => {
    // Load recommendations (in production, fetch from /api/recommendations)
    const mockRecommendations: Recommendation[] = [
      {
        id: '1',
        title: 'Increase Extra Payment to Debt',
        description:
          'Your current extra payment is $0. If you allocate even $200/month extra, you could be debt-free 18 months earlier and save $4,500 in interest.',
        impact: 'high',
        category: 'debt',
        estimatedSavings: 4500,
        timeframe: '18 months faster',
        icon: <TrendingDown className="text-green-500" size={24} />,
      },
      {
        id: '2',
        title: 'Switch to Avalanche Strategy',
        description:
          'Your highest interest debt is the credit card at 18.5%. Prioritizing this over other debts could save you $2,100 compared to the Snowball method.',
        impact: 'high',
        category: 'strategy',
        estimatedSavings: 2100,
        timeframe: 'Throughout payoff',
        icon: <Zap className="text-blue-500" size={24} />,
      },
      {
        id: '3',
        title: 'Negotiate Lower Interest Rate',
        description:
          'Contact your credit card issuer and request a lower APR. Even a 2% reduction could save you $1,800 in interest. Your credit score supports this request.',
        impact: 'high',
        category: 'strategy',
        estimatedSavings: 1800,
        timeframe: 'Immediate if approved',
        icon: <Award className="text-yellow-500" size={24} />,
      },
      {
        id: '4',
        title: 'Build Emergency Fund',
        description:
          'You have $5,000 in emergency savings. Aim for $7,500 (3 months of expenses) to avoid taking on more debt in case of emergency.',
        impact: 'medium',
        category: 'savings',
        timeframe: '4-6 months',
        icon: <MessageSquare className="text-purple-500" size={24} />,
      },
      {
        id: '5',
        title: 'Review Monthly Subscriptions',
        description:
          'Your gym membership ($45/month) and other recurring charges add up to $124.99/month. Consider canceling unused services.',
        impact: 'low',
        category: 'lifestyle',
        estimatedSavings: 125,
        timeframe: 'Monthly',
        icon: <TrendingDown className="text-orange-500" size={24} />,
      },
      {
        id: '6',
        title: 'Set Debt Freedom Milestone',
        description:
          'Based on current payments ($650/month), you could be debt-free in approximately 84 months. Consider this your target.',
        impact: 'medium',
        category: 'strategy',
        timeframe: '7 years at current rate',
        icon: <Award className="text-green-500" size={24} />,
      },
    ]

    // Simulate API call
    setTimeout(() => {
      setRecommendations(mockRecommendations)
      setLoading(false)
    }, 800)
  }, [])

  const filteredRecommendations =
    activeCategory === 'all'
      ? recommendations
      : recommendations.filter((r) => r.category === activeCategory)

  const highImpactRecommendations = recommendations
    .filter((r) => r.impact === 'high')
    .slice(0, 3)

  const totalPotentialSavings = recommendations.reduce(
    (sum, r) => sum + (r.estimatedSavings || 0),
    0
  )

  const impactColor = {
    high: 'bg-red-500/20 border-red-500/50 text-red-400',
    medium: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
    low: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  }

  const impactLabel = {
    high: 'High Impact',
    medium: 'Medium Impact',
    low: 'Low Impact',
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="text-blue-500" size={40} />
            <h1 className="text-4xl font-bold">AI Financial Recommendations</h1>
          </div>
          <p className="text-gray-300 text-lg">
            Personalized strategies to accelerate your debt elimination
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">Total Potential Savings</p>
            <p className="text-2xl font-bold text-green-400">${totalPotentialSavings.toLocaleString()}</p>
          </div>
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">Debt-to-Income Ratio</p>
            <p className="text-2xl font-bold text-orange-400">{userStats.debtToIncomeRatio}:1</p>
          </div>
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">Monthly Surplus</p>
            <p className="text-2xl font-bold text-blue-400">
              ${(userStats.monthlyIncome - userStats.monthlyExpenses).toLocaleString()}
            </p>
          </div>
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">Recommendations</p>
            <p className="text-2xl font-bold text-purple-400">{recommendations.length}</p>
          </div>
        </div>

        {/* High Priority Section */}
        {highImpactRecommendations.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              🔴 High Priority Actions
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {highImpactRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/30 rounded-lg p-6 hover:border-red-500 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    {rec.icon}
                    <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded">
                      HIGH
                    </span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{rec.title}</h3>
                  <p className="text-gray-300 text-sm mb-4">{rec.description}</p>
                  {rec.estimatedSavings && (
                    <p className="text-green-400 font-semibold text-sm">
                      💰 Save ${rec.estimatedSavings.toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-8">
          <p className="text-gray-400 text-sm mb-3">Filter by Category:</p>
          <div className="flex flex-wrap gap-2">
            {(['all', 'debt', 'savings', 'strategy', 'lifestyle'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg transition ${
                  activeCategory === cat
                    ? 'bg-green-500 text-black font-semibold'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* All Recommendations */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-6">
            {filteredRecommendations.length} Recommendation
            {filteredRecommendations.length !== 1 ? 's' : ''}
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Loading recommendations...</p>
            </div>
          ) : filteredRecommendations.length > 0 ? (
            filteredRecommendations.map((rec) => (
              <div
                key={rec.id}
                className={`border rounded-lg p-6 transition hover:shadow-lg ${impactColor[rec.impact]}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    <div>{rec.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg">{rec.title}</h3>
                        <span className={`text-xs font-semibold px-2 py-1 rounded border`}>
                          {impactLabel[rec.impact]}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-3">{rec.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {rec.estimatedSavings && (
                          <div>
                            <p className="text-gray-400">Potential Savings</p>
                            <p className="font-bold text-green-400">
                              ${rec.estimatedSavings.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {rec.timeframe && (
                          <div>
                            <p className="text-gray-400">Timeframe</p>
                            <p className="font-bold">{rec.timeframe}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="text-gray-500" size={24} />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">No recommendations in this category</p>
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-12 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold mb-3">Ready to Take Action?</h3>
          <p className="text-gray-300 mb-6">
            Use our debt payoff calculator to implement these recommendations
          </p>
          <Link
            href="/debt-payoff-calculator"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg transition"
          >
            Go to Debt Payoff Calculator →
          </Link>
        </div>
      </div>
    </div>
  )
}
