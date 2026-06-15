export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
            <p>
              Paycheck Planner ("we" or "us" or "our") operates the paycheck planner website. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our service and the choices you have associated with that data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Information Collection and Use</h2>
            <p>We collect several different types of information for various purposes:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Account Data:</strong> Email address, name, and account preferences</li>
              <li><strong>Financial Data:</strong> Debt information, bills, income, and assets you input</li>
              <li><strong>Usage Data:</strong> Browser type, IP address, pages visited, and time spent</li>
              <li><strong>Cookies:</strong> We use cookies to enhance your experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Use of Data</h2>
            <p>Paycheck Planner uses the collected data for various purposes:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>To provide and maintain our service</li>
              <li>To notify you about changes to our service</li>
              <li>To allow you to participate in interactive features</li>
              <li>To provide customer support</li>
              <li>To gather analysis and analytics</li>
              <li>To improve and optimize our website</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Security of Data</h2>
            <p>
              The security of your data is important to us but remember that no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal data, we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at support@paycheckplanner.ai.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. GDPR Compliance</h2>
            <p>
              If you are a resident of the European Union, you have certain data protection rights. Paycheck Planner aims to take reasonable steps to allow you to correct, amend, delete, or limit the use of your personal data.
            </p>
          </section>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-8">
            <p className="text-blue-400 text-xs">
              <strong>Last Updated:</strong> May 2024. We may update this policy at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
