export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: June 20, 2026</p>

        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
          <section>
            <p>
              This Privacy Policy explains how DiBeasi Global Investments LLC, doing business as
              "Paycheck Planner" ("Company", "we", "us", or "our"), collects, uses, and shares
              personal information when you use Paycheck Planner (the "Service"), including our
              website, web application, and mobile apps. By using the Service you agree to this
              Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Information We Collect</h2>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Account data:</strong> email address, name, and authentication details (including Google sign-in if you use it).</li>
              <li><strong>Financial data you enter:</strong> debts, bills, income, goals, and related figures you choose to input.</li>
              <li><strong>Connected account data (Autopilot, when available):</strong> read-only balances and liabilities imported through Plaid if you connect an account.</li>
              <li><strong>Billing data:</strong> subscription tier and status. Card details are handled by our payment processors, not stored by us.</li>
              <li><strong>Usage data:</strong> device and browser type, IP address, pages or screens viewed, and similar diagnostic information.</li>
              <li><strong>Cookies and similar technologies:</strong> used to keep you signed in and to understand aggregate usage.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. How We Use Information</h2>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Provide, maintain, and secure the Service.</li>
              <li>Process subscriptions and send service-related communications.</li>
              <li>Provide customer support and respond to your requests.</li>
              <li>Understand aggregate usage to improve the Service.</li>
              <li>Detect, prevent, and address fraud, abuse, or security issues.</li>
              <li>Comply with legal obligations.</li>
            </ul>
            <p className="mt-2">We do not sell your personal information.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Service Providers We Share With</h2>
            <p>
              We share information only as needed to operate the Service, with providers who process
              data on our behalf under their own privacy and security commitments:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Supabase</strong> - database, authentication, and storage.</li>
              <li><strong>Stripe</strong> - payment processing for web subscriptions.</li>
              <li><strong>Apple App Store / Google Play and RevenueCat</strong> - processing and management of mobile in-app subscriptions.</li>
              <li><strong>Resend</strong> - transactional and notification emails.</li>
              <li><strong>Vercel</strong> - application hosting and basic analytics.</li>
              <li><strong>Google</strong> - optional single sign-on.</li>
              <li><strong>Plaid</strong> (Autopilot, when available) - secure read-only access to connected financial accounts.</li>
            </ul>
            <p className="mt-2">
              We may also disclose information if required by law, to enforce our Terms, or to protect
              the rights, safety, and security of our users or the Company.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Bank Connections and Plaid</h2>
            <p>
              If you choose to connect a financial account through the Autopilot tier (when
              launched), we use Plaid Inc. to access read-only information such as balances and
              liabilities. We do not move money, initiate payments, or store your online banking
              credentials; your credentials are entered with Plaid, not with us. You can disconnect a
              linked account at any time, which stops further access, and you can delete your account
              to remove the imported data. Plaid's use of your information is governed by Plaid's own
              privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Data Retention and Deletion</h2>
            <p>
              We keep your information for as long as your account is active or as needed to provide
              the Service. You can delete your account at any time from your account settings, which
              permanently removes Your Data (including financial entries and any connected-account
              data) from our active systems. Residual copies may persist in encrypted backups for a
              limited period before being overwritten, and we may retain limited records where
              required by law or for legitimate business purposes such as tax and transaction
              records.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Security</h2>
            <p>
              We use technical and organizational measures to protect your information, including
              encryption in transit and at rest and access controls. No method of transmission or
              storage is completely secure, so we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Your Privacy Rights</h2>
            <p>
              <strong>California (CCPA/CPRA).</strong> California residents have the right to know
              what personal information we collect, to request access or deletion, to request
              correction, and to opt out of the "sale" or "sharing" of personal information. We do
              not sell or share personal information as those terms are defined under California law.
              We will not discriminate against you for exercising these rights.
            </p>
            <p className="mt-2">
              <strong>EU/UK (GDPR).</strong> If you are in the European Economic Area or United
              Kingdom, you have rights to access, correct, delete, restrict, or port your personal
              data, and to object to certain processing.
            </p>
            <p className="mt-2">
              To exercise any of these rights, email us at support@paycheckplanner.ai. You can also
              delete your account directly in the app at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Children's Privacy</h2>
            <p>
              The Service is not directed to children under 13, and we do not knowingly collect
              personal information from children under 13. If you believe a child has provided us
              information, contact us and we will delete it. The Service is intended for users 18 and
              older.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Policy from time to time. We will post the updated version here and
              revise the "Last updated" date above. Material changes may be communicated through the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Contact Us</h2>
            <p>
              Questions about this Policy? Contact DiBeasi Global Investments LLC at
              support@paycheckplanner.ai.
            </p>
          </section>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-8">
            <p className="text-blue-400 text-xs">
              <strong>Last Updated:</strong> June 20, 2026. We may update this policy at any time;
              please review it periodically.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}