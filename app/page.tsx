'use client'

import Link from 'next/link'
import { CheckCircle2, TrendingDown, Brain, Zap } from 'lucide-react'
import MemberMilestone from './components/MemberMilestone'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#020617] text-white">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Plan Every Paycheck. <span className="text-green-500">Eliminate Debt</span> Faster.
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Take control of your financial future with AI-powered debt elimination strategies, real-time paycheck planning, and personalized financial insights.
            </p>
            <div className="flex gap-4">
              <Link href="/signup" className="bg-green-500 hover:bg-green-600 text-black font-semibold px-8 py-3 rounded-lg text-lg transition">
                Start Free
              </Link>
              <Link href="/pricing" className="border border-green-500 text-green-500 hover:bg-green-500/10 font-semibold px-8 py-3 rounded-lg text-lg transition">
                View Plans
              </Link>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-2xl p-8 border border-gray-700">
            <div className="space-y-6">
              <div className="flex gap-4">
                <TrendingDown className="text-green-500 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold text-lg">Average Debt Payoff Time</h3>
                  <p className="text-gray-300">Users see results in as little as 24-36 months</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Brain className="text-blue-500 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold text-lg">AI-Powered Strategy</h3>
                  <p className="text-gray-300">Machine learning analyzes your finances for optimal payoff</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Zap className="text-yellow-500 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold text-lg">Instant Insights</h3>
                  <p className="text-gray-300">Real-time dashboards and predictive analytics</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof / milestone */}
      <MemberMilestone />

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-12">Powerful Features</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'Debt Payoff Calculator', desc: 'Multiple strategy comparison & timeline projection' },
            { title: 'Bill Tracking', desc: 'Never miss a payment with smart reminders' },
            { title: 'Financial Milestones', desc: 'Track your progress toward debt freedom' },
            { title: 'AI Insights', desc: 'Get personalized recommendations (Premium)' },
            { title: 'Advanced Analytics', desc: 'Deep financial forecasting & scenario planning' },
            { title: 'Snowball & Avalanche', desc: 'Compare multiple payoff strategies' },
          ].map((f, i) => (
            <div key={i} className="border border-gray-700 rounded-lg p-6 hover:border-green-500 transition bg-[#0f172a]/50">
              <CheckCircle2 className="text-green-500 mb-3" size={24} />
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-y border-gray-700 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Take Control?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Start free, upgrade anytime. Cancel whenever you want.
          </p>
          <Link href="/signup" className="inline-block bg-green-500 hover:bg-green-600 text-black font-semibold px-8 py-4 rounded-lg text-lg transition">
            Get Started Free
          </Link>
        </div>
      </section>
    </main>
  )
}