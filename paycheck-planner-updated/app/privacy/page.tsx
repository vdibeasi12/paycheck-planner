import Link from "next/link"

export const metadata = {
  title: "Privacy Policy - Paycheck Planner",
  description: "Learn how Paycheck Planner protects your privacy and handles your data",
}

export default function PrivacyPage() {
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

          <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8 text-slate-300">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
              <p className="mb-4">
                Paycheck Planner ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy 
                Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and 
                use our services.
              </p>
              <p>
                Please read this privacy policy carefully. If you do not agree with our policies and practices, please do not 
                use our Service.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">Personal Information You Provide</h3>
              <p className="mb-4">We collect information you voluntarily provide, such as:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Name and email address (for account creation)</li>
                <li>Financial information (debts, income, bills)</li>
                <li>Payment information (processed securely via Stripe)</li>
                <li>Messages and communications with us</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">Automatically Collected Information</h3>
              <p className="mb-4">When you access our Service, we automatically collect:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Log data (IP address, browser type, pages visited)</li>
                <li>Device information (operating system, unique device identifiers)</li>
                <li>Usage information (features accessed, time spent)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            {/* How We Use Information */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
              <p className="mb-4">We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Provide, maintain, and improve our Service</li>
                <li>Create and manage your account</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices and support messages</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Analyze usage patterns to improve user experience</li>
                <li>Comply with legal obligations</li>
                <li>Protect against fraud and security threats</li>
              </ul>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Data Security</h2>
              <p className="mb-4">
                We implement comprehensive security measures to protect your personal information, including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>SSL/TLS encryption for all data in transit</li>
                <li>AES-256 encryption for sensitive data at rest</li>
                <li>Regular security audits and penetration testing</li>
                <li>Strict access controls and authentication protocols</li>
                <li>GDPR and industry-standard compliance measures</li>
              </ul>
              <p>
                However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of 
                your personal information.
              </p>
            </section>

            {/* Data Sharing */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Data Sharing</h2>
              <p className="mb-4">
                <strong>We do NOT sell your personal information.</strong> We may share information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li><strong>Service Providers:</strong> With vendors who process data on our behalf (Supabase for storage, Stripe for payments)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our legal rights</li>
                <li><strong>Business Transfers:</strong> In case of merger, acquisition, or bankruptcy</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize sharing</li>
              </ul>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Cookies and Tracking</h2>
              <p className="mb-4">
                We use cookies to enhance your experience. You can control cookie preferences in your browser settings. 
                Disabling cookies may affect your ability to use certain features of our Service.
              </p>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Your Privacy Rights</h2>
              <p className="mb-4">Depending on your location, you may have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Access your personal data</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to data processing</li>
                <li>Request restriction of processing</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <p>
                To exercise these rights, please contact us at privacy@paycheckplanner.com.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Data Retention</h2>
              <p className="mb-4">
                We retain your personal information for as long as your account is active or as long as needed to provide 
                services. You can request deletion of your account and data at any time. Some information may be retained for 
                legal or compliance purposes.
              </p>
            </section>

            {/* Third-Party Services */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Third-Party Services</h2>
              <p className="mb-4">
                Our Service may contain links to third-party websites. We are not responsible for the privacy practices of 
                third-party sites. Please review their privacy policies before providing any information.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Children's Privacy</h2>
              <p className="mb-4">
                Our Service is not directed to children under 18. We do not knowingly collect personal information from 
                children. If we become aware that a child has provided us with personal information, we will delete such 
                information promptly.
              </p>
            </section>

            {/* GDPR Compliance */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. GDPR Compliance</h2>
              <p className="mb-4">
                For residents of the European Union, we comply with the General Data Protection Regulation (GDPR). 
                Your personal data is processed lawfully based on your consent or our legitimate interests.
              </p>
            </section>

            {/* Contact Us */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Contact Us</h2>
              <p className="mb-4">
                If you have questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <p className="font-semibold">
                Email: privacy@paycheckplanner.com
              </p>
            </section>

            {/* Changes to Policy */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">13. Changes to This Policy</h2>
              <p className="mb-4">
                We may update this Privacy Policy periodically. We will notify you of changes by posting the updated policy 
                on this page and updating the "Last Updated" date. Your continued use of our Service constitutes your acceptance 
                of the updated policy.
              </p>
            </section>
          </div>

          <div className="mt-12 p-6 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-slate-400">
              Also see our <Link href="/terms" className="text-green-400 hover:text-green-300">Terms of Service</Link> and 
              <Link href="/disclaimer" className="text-green-400 hover:text-green-300"> Financial Disclaimer</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}