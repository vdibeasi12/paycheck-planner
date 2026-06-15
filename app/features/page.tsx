export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-4">Powerful Features to Master Your Money</h1>
        <p className="text-gray-300 text-lg mb-12">
          Everything you need to eliminate debt, plan your finances, and achieve financial freedom.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Feature 1 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-2xl font-bold mb-3">Debt Payoff Calculator</h2>
            <p className="text-gray-300 mb-4">
              Compare Snowball and Avalanche debt payoff strategies side-by-side. See exactly how long it will take to become debt-free and how much interest you'll pay.
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ Add unlimited debts</li>
              <li>✓ Track interest rates</li>
              <li>✓ Set extra payment amounts</li>
              <li>✓ Export comparison reports</li>
            </ul>
          </div>

          {/* Feature 2 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">📸</div>
            <h2 className="text-2xl font-bold mb-3">Bill OCR & Upload</h2>
            <p className="text-gray-300 mb-4">
              Take a photo of your bills and our AI automatically extracts vendor name, amount, and due date. Never manually enter bill information again.
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ Snap photos of bills</li>
              <li>✓ Automatic data extraction</li>
              <li>✓ Confidence scoring</li>
              <li>✓ Manual corrections available</li>
            </ul>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">📈</div>
            <h2 className="text-2xl font-bold mb-3">Financial Dashboard</h2>
            <p className="text-gray-300 mb-4">
              See all your finances at a glance. Track debts, bills, assets, and net worth with beautiful charts and real-time calculations.
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ Real-time metrics</li>
              <li>✓ Multiple visualizations</li>
              <li>✓ Debt-to-income ratio</li>
              <li>✓ Net worth tracking</li>
            </ul>
          </div>

          {/* Feature 4 */}
          <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-8">
            <div className="text-4xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold mb-3">AI Recommendations (Premium)</h2>
            <p className="text-gray-300 mb-4">
              Get personalized financial advice powered by AI. Discover strategies to save money, optimize your debt payoff, and reach your goals faster.
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>✓ Smart suggestions</li>
              <li>✓ Impact scoring</li>
              <li>✓ Savings estimates</li>
              <li>✓ Personalized strategies</li>
            </ul>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-lg p-8 mb-12">
          <h2 className="text-3xl font-bold mb-8">Why Choose Paycheck Planner?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold text-green-400 mb-3">⚡ Fast Setup</h3>
              <p className="text-gray-300">
                Get started in minutes. No complicated forms or lengthy onboarding. Just enter your debts and get instant insights.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-blue-400 mb-3">🔒 Secure & Private</h3>
              <p className="text-gray-300">
                Your financial data is encrypted and protected. We never share your information with third parties.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-purple-400 mb-3">📱 Always Available</h3>
              <p className="text-gray-300">
                Access your finances anytime, anywhere. Fully responsive design works on mobile, tablet, and desktop.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-[#0f172a] border border-gray-700 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Ready to Take Control?</h2>
          <p className="text-gray-300 mb-6">
            Start with our Free plan and upgrade anytime to unlock premium features.
          </p>
          <a 
            href="/pricing"
            className="inline-block bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg transition"
          >
            View Plans & Pricing
          </a>
        </div>
      </div>
    </div>
  )
}
