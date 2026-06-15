export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-8">About Paycheck Planner</h1>
        
        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
            <p>
              Paycheck Planner is a modern financial management platform designed to empower you to take control of your finances and eliminate debt faster. We believe everyone deserves access to powerful financial tools that make it easy to understand and improve their financial situation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">What We Do</h2>
            <p>
              We provide a comprehensive suite of financial planning tools that help you:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Compare debt payoff strategies (Snowball vs Avalanche)</li>
              <li>Track bills efficiently with AI-powered OCR technology</li>
              <li>Get real-time insights into your financial health</li>
              <li>Receive personalized recommendations to save money</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Why Choose Us</h2>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Fast & Easy:</strong> Set up your financial plan in minutes</li>
              <li><strong>Secure:</strong> Military-grade encryption protects your data</li>
              <li><strong>Smart:</strong> AI-powered insights help you make better decisions</li>
              <li><strong>Affordable:</strong> Free plan available with no credit card needed</li>
            </ul>
          </section>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mt-8">
            <p className="text-green-400">
              <strong>Important:</strong> Paycheck Planner provides planning tools and educational content only. We are not a financial advisor. Always consult with a qualified financial professional before making major financial decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
