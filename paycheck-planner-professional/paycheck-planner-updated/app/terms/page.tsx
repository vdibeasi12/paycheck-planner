import Link from "next/link"

export const metadata = {
  title: "Terms of Service - Paycheck Planner",
  description: "Read our terms of service to understand how Paycheck Planner works",
}

export default function TermsPage() {
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

          <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="space-y-8 text-slate-300">
            {/* Agreement */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Agreement to Terms</h2>
              <p className="mb-4">
                By accessing and using Paycheck Planner ("the Service"), you accept and agree to be bound by the terms and 
                provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            {/* Use License */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Use License</h2>
              <p className="mb-4">
                Permission is granted to temporarily download one copy of the materials (information or software) on 
                Paycheck Planner for personal, non-commercial transitory viewing only. This is the grant of a license, 
                not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Modifying or copying the materials</li>
                <li>Using the materials for any commercial purpose or for any public display</li>
                <li>Attempting to decompile or reverse engineer any software contained on Paycheck Planner</li>
                <li>Removing any copyright or other proprietary notations from the materials</li>
                <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
                <li>Violating any applicable laws or regulations related to access to or use of the Service</li>
              </ul>
            </section>

            {/* Disclaimer */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Disclaimer</h2>
              <p className="mb-4">
                The materials on Paycheck Planner are provided on an 'as is' basis. Paycheck Planner makes no warranties, 
                expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, 
                implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement 
                of intellectual property or other violation of rights.
              </p>
              <p className="mb-4">
                Paycheck Planner does not warrant or make any representations concerning the accuracy, likely results, or 
                reliability of the use of the materials on the Internet web site, or otherwise relating to such materials 
                or on any sites linked to this site.
              </p>
            </section>

            {/* Limitations */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Limitations</h2>
              <p className="mb-4">
                In no event shall Paycheck Planner or its suppliers be liable for any damages (including, without limitation, 
                damages for loss of data or profit, or due to business interruption,) arising out of the use or inability to 
                use the materials on Paycheck Planner, even if Paycheck Planner or a Paycheck Planner authorized representative 
                has been notified orally or in writing of the possibility of such damage.
              </p>
            </section>

            {/* Financial Advice Disclaimer */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Financial Advice Disclaimer</h2>
              <p className="mb-4">
                Paycheck Planner provides financial planning tools and information for educational and informational purposes only. 
                We are NOT financial advisors, accountants, or tax professionals. The information provided should not be construed 
                as professional financial, investment, legal, or tax advice.
              </p>
              <p className="mb-4">
                Before making any financial decisions, please consult with a qualified financial advisor, accountant, or attorney 
                who is familiar with your specific situation. Your use of the Service constitutes acknowledgment that you understand 
                these limitations.
              </p>
            </section>

            {/* Accuracy of Materials */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Accuracy of Materials</h2>
              <p className="mb-4">
                The materials appearing on Paycheck Planner could include technical, typographical, or photographic errors. 
                Paycheck Planner does not warrant that any of the materials on the website are accurate, complete, or current. 
                Paycheck Planner may make changes to the materials contained on the website at any time without notice.
              </p>
            </section>

            {/* Links */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Links</h2>
              <p className="mb-4">
                Paycheck Planner has not reviewed all of the sites linked to its website and is not responsible for the contents 
                of any such linked site. The inclusion of any link does not imply endorsement by Paycheck Planner of the site. 
                Use of any such linked website is at the user's own risk.
              </p>
            </section>

            {/* Modifications */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Modifications</h2>
              <p className="mb-4">
                Paycheck Planner may revise these terms of service for the website at any time without notice. By using this website, 
                you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </section>

            {/* User Accounts */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. User Accounts</h2>
              <p className="mb-4">
                When you create an account with Paycheck Planner, you must provide accurate and complete information. You are 
                responsible for maintaining the confidentiality of your password and are fully responsible for all activities 
                that occur under your account. You agree to notify us immediately of any unauthorized uses of your account.
              </p>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Data Security</h2>
              <p className="mb-4">
                Paycheck Planner uses industry-standard encryption and security measures to protect your data. However, no method 
                of transmission over the internet or electronic storage is 100% secure. Therefore, we cannot guarantee absolute 
                security. For detailed information, please see our Privacy Policy.
              </p>
            </section>

            {/* Payment Terms */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Payment Terms</h2>
              <p className="mb-4">
                For premium features, you agree to pay all fees and charges that you incur. We accept payment via credit card 
                through Stripe. Billing will occur on a recurring basis according to your selected plan. You can cancel your 
                subscription at any time through your account settings.
              </p>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Termination</h2>
              <p className="mb-4">
                Paycheck Planner reserves the right to terminate or suspend your account and access to the Service at any time, 
                for any reason, including but not limited to breach of these Terms of Service.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">13. Governing Law</h2>
              <p className="mb-4">
                These terms and conditions are governed by and construed in accordance with the laws of the United States, 
                and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">14. Contact Information</h2>
              <p className="mb-4">
                If you have any questions about these Terms of Service, please contact us at support@paycheckplanner.com.
              </p>
            </section>
          </div>

          <div className="mt-12 p-6 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-slate-400">
              Also see our <Link href="/privacy" className="text-green-400 hover:text-green-300">Privacy Policy</Link> and 
              <Link href="/disclaimer" className="text-green-400 hover:text-green-300"> Financial Disclaimer</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}