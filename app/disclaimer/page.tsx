import PageWrapper from '../components/PageWrapper'

export default function DisclaimerPage() {
  return (
    <PageWrapper maxWidth="4xl">
      <div>
        <h1 className="text-4xl font-bold mb-2">Disclaimer</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: June 20, 2026</p>

        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">General</h2>
            <p>
              Paycheck Planner is operated by DiBeasi Global Investments LLC (doing business as
              "Paycheck Planner"), an independent financial management platform. We are not
              affiliated with, endorsed by, or associated with any bank, lender, or third-party
              financial service provider. Any third-party names or trademarks that may appear are the
              property of their respective owners and are used for identification only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Educational Content Only</h2>
            <p>
              Paycheck Planner provides educational content and planning tools for informational
              purposes only. We do NOT provide financial, legal, investment, or tax advice. Our
              calculators and tools are designed to help you understand financial concepts and plan
              your finances, but they are not substitutes for professional advice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">No Professional Advice</h2>
            <p>
              ALWAYS consult with a qualified financial advisor, accountant, or attorney before
              making any financial decisions. Paycheck Planner is not responsible for any decisions
              you make based on information provided by our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Accuracy and Completeness</h2>
            <p>
              While we strive to provide accurate information, Paycheck Planner makes no warranties
              regarding the accuracy, completeness, or timeliness of any information. All financial
              projections are estimates based on your inputs and may not reflect actual outcomes.
              Past performance does not guarantee future results.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Interest Rates and Fees</h2>
            <p>
              Interest rates, fees, and other financial terms can change frequently. Our calculators
              use the information you provide and should be updated regularly to reflect current
              rates and terms. Always verify current rates with your financial institutions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Bank Connections (when available)</h2>
            <p>
              If you connect a financial account through the Autopilot tier, access is read-only and
              provided through Plaid Inc. Paycheck Planner does not move money, initiate transfers or
              payments, or store your banking credentials. Imported figures are estimates for
              planning and may differ from your institution's records; always verify with your bank.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Limitation of Liability</h2>
            <p>
              Paycheck Planner shall not be liable for any indirect, incidental, special, or
              consequential damages arising out of or related to your use of this platform, including
              but not limited to financial losses or decisions made based on our tools.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Data Security</h2>
            <p>
              We protect your information using encryption in transit and at rest along with access
              controls. However, no online platform is 100% secure, and you acknowledge the risks
              associated with using internet-based services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Third-Party Links</h2>
            <p>
              Paycheck Planner may contain links to third-party websites. We are not responsible for
              the content or privacy practices of external sites. Your use of third-party sites is at
              your own risk and subject to their terms.
            </p>
          </section>

          <section className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 mt-8">
            <p className="text-yellow-400 font-bold mb-2">Important:</p>
            <p>
              This disclaimer applies to all users of Paycheck Planner. By using our platform, you
              acknowledge that you have read this disclaimer and agree to its terms. If you do not
              agree, please do not use our services.
            </p>
          </section>
        </div>
      </div>
    </PageWrapper>
  )
}