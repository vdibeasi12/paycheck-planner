import Link from "next/link"

export const metadata = {
  title: "Financial Disclaimer - Paycheck Planner",
  description: "Important financial disclaimer for Paycheck Planner services",
}

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 md:p-12">
          <Link 
            href="/" 
            className="text-green-400 hover:text-green-300 text-sm mb-6 inline-block"
          >
            ← Back to Home
          </Link>

          <h1 className="text-4xl font-bold text-white mb-2">Financial Disclaimer</h1>
          <p className="text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8 text-slate-300">
            {/* Important Notice */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-red-400 mb-4">⚠️ Important Notice</h2>
              <p className="text-white font-semibold">
                Paycheck Planner is NOT a licensed financial advisor, investment advisor, or financial professional. 
                We provide financial planning tools and information for educational purposes only.
              </p>
            </div>

            {/* Not Professional Advice */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Not Professional Financial Advice</h2>
              <p className="mb-4">
                The information, tools, and calculations provided by Paycheck Planner are for informational and 
                educational purposes only. They do not constitute professional financial, investment, legal, or tax advice.
              </p>
              <p className="mb-4">
                We strongly recommend that you consult with a qualified financial advisor, CPA, attorney, or other 
                professional who is familiar with your personal financial situation before making any financial decisions.
              </p>
            </section>

            {/* No Warranty */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. No Warranty</h2>
              <p className="mb-4">
                Paycheck Planner provides its tools and services "as is" and "as available" without warranty of any kind, 
                express or implied. We do not warrant that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>The calculations will be accurate or error-free</li>
                <li>The projections or forecasts will occur as calculated</li>
                <li>Your financial situation will improve as a result of using our Service</li>
                <li>The Service will be uninterrupted or free from errors</li>
                <li>Any defects will be corrected</li>
              </ul>
            </section>

            {/* Accuracy of Information */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Accuracy of Information</h2>
              <p className="mb-4">
                The accuracy of our calculations and projections depends entirely on the accuracy of the information 
                you provide. Paycheck Planner is not responsible for inaccurate results that occur due to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Incorrect data entry by you</li>
                <li>Changes in interest rates or loan terms</li>
                <li>Changes in your income or expenses</li>
                <li>Unexpected life events</li>
                <li>Changes in tax laws or regulations</li>
                <li>Market conditions or economic factors</li>
              </ul>
            </section>

            {/* Limitations of Projections */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Limitations of Projections</h2>
              <p className="mb-4">
                Financial projections and debt payoff timelines are estimates based on assumptions and the data you provide. 
                Actual results may differ significantly. Factors that could affect actual results include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Changes in interest rates (variable rate debt)</li>
                <li>Changes in payment amounts</li>
                <li>Additional fees or charges</li>
                <li>Late payments or missed payments</li>
                <li>Credit score changes</li>
                <li>Loan modifications or refinancing</li>
                <li>Unexpected expenses</li>
                <li>Income fluctuations</li>
              </ul>
            </section>

            {/* Not Investment Advice */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Not Investment Advice</h2>
              <p className="mb-4">
                Paycheck Planner does not provide investment advice. Any information about investment strategies, 
                asset allocation, or investment vehicles is educational only and does not constitute a recommendation 
                or endorsement.
              </p>
              <p>
                All investments carry risk, including potential loss of principal. Past performance does not guarantee 
                future results. Please consult with a qualified investment advisor before making any investment decisions.
              </p>
            </section>

            {/* Tax Considerations */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Tax Considerations</h2>
              <p className="mb-4">
                The information provided by Paycheck Planner does not take into account your specific tax situation. 
                Tax laws are complex and change frequently. We strongly recommend consulting with a qualified tax 
                professional (CPA or tax attorney) about:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Tax implications of debt payoff strategies</li>
                <li>Interest deductions or tax credits you may be eligible for</li>
                <li>Tax consequences of debt forgiveness</li>
                <li>Quarterly estimated tax payments</li>
                <li>Your overall tax planning strategy</li>
              </ul>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Limitation of Liability</h2>
              <p className="mb-4">
                In no event shall Paycheck Planner, its officers, directors, employees, or agents be liable for any 
                indirect, incidental, special, consequential, or punitive damages, including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Loss of income or revenue</li>
                <li>Loss of profits or business opportunity</li>
                <li>Loss of data or information</li>
                <li>Any other pecuniary loss or damage</li>
              </ul>
              <p className="mt-4">
                This applies even if Paycheck Planner has been advised of the possibility of such damages.
              </p>
            </section>

            {/* Your Responsibility */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Your Responsibility</h2>
              <p className="mb-4">
                You are responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Verifying the accuracy of all information you input</li>
                <li>Reviewing calculations and projections carefully</li>
                <li>Seeking professional advice before making financial decisions</li>
                <li>Understanding the terms and conditions of your debts</li>
                <li>Monitoring your accounts and payment history</li>
                <li>Staying informed about changes in financial laws or regulations</li>
              </ul>
            </section>

            {/* Healthcare and Insurance */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Healthcare and Insurance Disclaimer</h2>
              <p className="mb-4">
                Paycheck Planner does not provide medical or health insurance advice. If you need to budget for healthcare 
                expenses, please consult with healthcare providers or insurance agents for accurate information about costs 
                and coverage.
              </p>
            </section>

            {/* Legal Status */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Legal and Debt Status</h2>
              <p className="mb-4">
                Paycheck Planner does not provide legal advice regarding debt collection, bankruptcy, credit matters, 
                or any other legal issues. If you are facing legal action related to debt, please consult with a 
                qualified attorney.
              </p>
            </section>

            {/* Acceptance of Disclaimer */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Acceptance of Disclaimer</h2>
              <p className="mb-4">
                By using Paycheck Planner, you acknowledge that you have read this disclaimer and understand its terms. 
                You agree that your use of our Service is at your own risk and that Paycheck Planner shall not be 
                responsible for any financial losses or other damages resulting from your use of our Service.
              </p>
            </section>

            {/* Severability */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Severability</h2>
              <p className="mb-4">
                If any portion of this disclaimer is found to be unenforceable, the remaining portions shall remain in 
                full force and effect.
              </p>
            </section>
          </div>

          <div className="mt-12 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <h3 className="font-bold text-yellow-400 mb-2">When to Seek Professional Help</h3>
            <p className="text-sm text-slate-300 mb-3">
              Please consult with qualified professionals if you:
            </p>
            <ul className="text-sm text-slate-300 space-y-1 ml-4 list-disc list-inside">
              <li>Are facing bankruptcy or foreclosure</li>
              <li>Are being pursued by debt collectors</li>
              <li>Have significant financial obligations</li>
              <li>Need tax or legal advice</li>
              <li>Want to make major financial decisions</li>
            </ul>
          </div>

          <div className="mt-8 p-6 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-slate-400">
              Also see our <Link href="/terms" className="text-green-400 hover:text-green-300">Terms of Service</Link> and 
              <Link href="/privacy" className="text-green-400 hover:text-green-300"> Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}