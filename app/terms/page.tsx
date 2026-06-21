export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: June 20, 2026</p>

        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
          <section>
            <p>
              Paycheck Planner (the "Service") is operated by DiBeasi Global Investments LLC, a
              limited liability company based in Illinois doing business as "Paycheck Planner"
              ("Company", "we", "us", or "our"). These Terms of Service ("Terms") govern your access
              to and use of the Service, including our website, web application, and mobile
              applications. By creating an account or using the Service, you agree to these Terms. If
              you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Eligibility</h2>
            <p>
              You must be at least 18 years old and able to form a binding contract to use the
              Service. The Service is intended for users in the United States. By using the Service
              you represent that you meet these requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Your Account</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials and
              for all activity under your account. You agree to provide accurate information and to
              keep it current. Notify us promptly of any unauthorized use. We offer optional
              two-factor authentication and recommend enabling it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. The Service and License</h2>
            <p>
              Subject to these Terms, we grant you a limited, non-exclusive, non-transferable,
              revocable license to access and use the Service for your own personal financial
              planning. You may not: (a) resell, sublicense, or commercially exploit the Service;
              (b) copy, modify, or create derivative works of the Service; (c) reverse engineer or
              attempt to extract source code, except where permitted by law; (d) access the Service
              by automated means without our permission; or (e) use the Service in violation of any
              law or to infringe the rights of others.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Subscriptions, Billing, and Renewals</h2>
            <p>
              The Service offers a free tier and paid subscription tiers. Paid features are described
              at the time of purchase. Prices may differ between our website and our mobile apps, and
              may change with notice for future billing periods.
            </p>
            <p className="mt-2">
              <strong>Web purchases (Stripe).</strong> Subscriptions purchased on our website are
              processed by Stripe, Inc. They renew automatically each billing period (monthly or
              annual) until cancelled. You may cancel at any time from your account settings;
              cancellation takes effect at the end of the current paid period, and you retain access
              until then. Except where required by law, payments are non-refundable, though we may
              consider refunds at our discretion.
            </p>
            <p className="mt-2">
              <strong>Mobile purchases (Apple App Store / Google Play).</strong> Subscriptions
              purchased inside our iOS or Android app are processed by Apple or Google through your
              App Store or Google Play account, not by us. They renew automatically unless you turn
              off auto-renewal at least 24 hours before the end of the current period. You manage,
              cancel, and request refunds for these subscriptions through your Apple or Google
              account settings, subject to Apple's or Google's policies; we are unable to cancel or
              refund store-billed subscriptions directly.
            </p>
            <p className="mt-2">
              Your plan entitlements are the same across web and mobile regardless of where you
              subscribed. Maintaining more than one active subscription for the same account may
              result in overlapping charges that we cannot always refund, so please cancel any
              duplicate before subscribing again on a different platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Your Data and Content</h2>
            <p>
              You retain ownership of the financial information and other content you enter into the
              Service ("Your Data"). You grant us a limited license to host, process, and display
              Your Data solely to operate and improve the Service for you. We do not sell Your Data.
              Our handling of personal information is described in our{" "}
              <a href="/privacy" className="text-green-500 hover:text-green-400">Privacy Policy</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Bank Connections (when available)</h2>
            <p>
              The Autopilot tier, when launched, will let you connect financial accounts through
              Plaid Inc. to import read-only account information such as balances and liabilities.
              The Service does not move money, initiate payments or transfers, or store your bank
              login credentials. You may disconnect linked accounts at any time. See our Privacy
              Policy for details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Not Financial Advice</h2>
            <p>
              The Service provides educational tools and informational projections only. It does not
              provide financial, investment, tax, or legal advice, and is not a substitute for a
              qualified professional. See our{" "}
              <a href="/disclaimer" className="text-green-500 hover:text-green-400">Disclaimer</a> for
              more.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Acceptable Use</h2>
            <p>
              You agree not to misuse the Service, including by attempting to gain unauthorized
              access, interfering with its operation, uploading malicious code, or using it to harass
              others or violate any law. We may suspend or limit access to protect the Service or its
              users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Termination and Account Deletion</h2>
            <p>
              You may stop using the Service and delete your account at any time from your account
              settings. Deleting your account permanently removes Your Data from active systems as
              described in our Privacy Policy. We may suspend or terminate your access if you violate
              these Terms or to comply with law. Provisions that by their nature should survive
              termination will survive.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Disclaimers and Limitation of Liability</h2>
            <p>
              The Service is provided "as is" and "as available" without warranties of any kind,
              express or implied, including merchantability, fitness for a particular purpose, and
              non-infringement. To the maximum extent permitted by law, the Company and its suppliers
              will not be liable for any indirect, incidental, special, consequential, or punitive
              damages, or for any loss of profits, data, or financial outcomes arising from your use
              of the Service. Our total liability for any claim relating to the Service will not
              exceed the amount you paid us in the twelve months before the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. If we make material changes, we will
              update the "Last updated" date and, where appropriate, notify you. Your continued use
              of the Service after changes take effect constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">12. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Illinois, without regard to its
              conflict-of-laws rules. You agree that the state and federal courts located in Illinois
              will have exclusive jurisdiction over any dispute arising from these Terms or the
              Service, except where applicable law provides otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">13. Contact</h2>
            <p>
              Questions about these Terms? Contact DiBeasi Global Investments LLC at
              support@paycheckplanner.ai.
            </p>
          </section>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-8">
            <p className="text-yellow-400 text-xs">
              <strong>NOT FINANCIAL ADVICE:</strong> Paycheck Planner provides educational tools
              only. Please consult a qualified financial professional before making financial
              decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}