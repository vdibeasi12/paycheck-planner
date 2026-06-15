'use client'

import Link from 'next/link'

export default function AIAdvisorPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-4">AI Financial Advisor</h1>
        <p className="text-gray-300 text-lg mb-12">
          Your personal AI-powered financial guide to help you make smarter money decisions
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Chat Interface Card */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-2xl font-bold mb-3">Chat with AI</h2>
            <p className="text-gray-300 mb-6">
              Ask questions about your finances, get personalized advice, and learn about debt strategies, budgeting, and savings.
            </p>
            <Link
              href="/ai-chat"
              className="inline-block bg-green-500 hover:bg-green-600 text-black font-semibold px-6 py-2 rounded transition"
            >
              Start Chat →
            </Link>
          </div>

          {/* Features Card */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold mb-3">AI Features</h2>
            <ul className="text-gray-300 space-y-2">
              <li>✓ Personalized debt payoff strategies</li>
              <li>✓ Budget optimization tips</li>
              <li>✓ Savings goal planning</li>
              <li>✓ Financial health analysis</li>
              <li>✓ Money-saving recommendations</li>
            </ul>
          </div>
        </div>

        {/* How It Works */}
        <section className="bg-[#0f172a] border border-gray-700 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6">How AI Advisor Works</h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-green-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-400 font-bold text-lg">1</span>
              </div>
              <h3 className="font-semibold mb-2">Ask Questions</h3>
              <p className="text-gray-400 text-sm">
                Ask anything about debt, budgeting, savings, or financial planning
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-400 font-bold text-lg">2</span>
              </div>
              <h3 className="font-semibold mb-2">Get Advice</h3>
              <p className="text-gray-400 text-sm">
                Receive instant, personalized recommendations tailored to your situation
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-400 font-bold text-lg">3</span>
              </div>
              <h3 className="font-semibold mb-2">Take Action</h3>
              <p className="text-gray-400 text-sm">
                Use our tools to implement strategies and track progress
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-400 font-bold text-lg">4</span>
              </div>
              <h3 className="font-semibold mb-2">Achieve Goals</h3>
              <p className="text-gray-400 text-sm">
                Build better financial habits and reach your goals faster
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
              <h3 className="font-bold text-green-400 mb-2">Is the AI advice personalized?</h3>
              <p className="text-gray-300 text-sm">
                Yes! The AI analyzes your questions and provides tailored advice based on your specific financial situation.
              </p>
            </div>

            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
              <h3 className="font-bold text-green-400 mb-2">What can I ask the AI?</h3>
              <p className="text-gray-300 text-sm">
                You can ask about debt payoff strategies, budgeting, savings goals, expense management, financial planning, and more!
              </p>
            </div>

            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
              <h3 className="font-bold text-green-400 mb-2">Is this real financial advice?</h3>
              <p className="text-gray-300 text-sm">
                Our AI provides educational guidance and recommendations. It's not a substitute for professional financial advice. Always consult a licensed financial advisor for major decisions.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Improve Your Financial Health?</h2>
          <p className="text-gray-300 mb-6">
            Start chatting with your AI Financial Advisor today
          </p>
          <Link
            href="/ai-chat"
            className="inline-block bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg transition"
          >
            Start Free Chat Now
          </Link>
        </div>
      </div>
    </div>
  )
}
