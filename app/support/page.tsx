export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-8">Help & Support</h1>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
              <h3 className="font-bold text-green-400 mb-2">How do I use the Debt Payoff Calculator?</h3>
              <p className="text-gray-300">
                Enter your debts with their balance, interest rate, and minimum payment. The calculator will show both Snowball and Avalanche strategies so you can compare which works best for you.
              </p>
            </div>

            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
              <h3 className="font-bold text-green-400 mb-2">How does Bill OCR work?</h3>
              <p className="text-gray-300">
                Take a photo of your bill and our system extracts vendor name, amount, and due date automatically. You can then review and save it to your tracker.
              </p>
            </div>

            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
              <h3 className="font-bold text-green-400 mb-2">Is my data safe?</h3>
              <p className="text-gray-300">
                Yes. We use military-grade encryption and follow security best practices. Your data is never shared with third parties without your consent.
              </p>
            </div>

            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
              <h3 className="font-bold text-green-400 mb-2">What are the pricing plans?</h3>
              <p className="text-gray-300">
                Free (3 debts), Starter ($33/year, 10 debts), Premium ($66/year, unlimited + AI). Start free, upgrade anytime.
              </p>
            </div>

            <div className="bg-[#0f172a] border border-gray-700 rounded-lg p-6">
              <h3 className="font-bold text-green-400 mb-2">Can I cancel my subscription?</h3>
              <p className="text-gray-300">
                Yes, cancel anytime. Your access continues until the end of your current billing period.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-green-500/10 border border-green-500/30 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Need More Help?</h2>
          <p className="text-gray-300 mb-6">
            Our support team is here to help. Email us at <strong>support@paycheckplanner.ai</strong>
          </p>
          <a 
            href="/contact"
            className="inline-block bg-green-500 hover:bg-green-600 text-black font-semibold px-6 py-2 rounded transition"
          >
            Contact Support
          </a>
        </section>
      </div>
    </div>
  )
}
