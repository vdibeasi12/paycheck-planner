export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Paycheck Planner, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Use License</h2>
            <p>
              Permission is granted to temporarily download one copy of the materials on Paycheck Planner for personal, non-commercial viewing only. This is a license, not a transfer of title. Under this license you may not:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Modify or copy the materials</li>
              <li>Use materials for any commercial purpose</li>
              <li>Attempt to decompile or reverse engineer any software</li>
              <li>Remove any copyright or proprietary notations</li>
              <li>Transfer materials to another person</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Disclaimer</h2>
            <p>
              The materials on Paycheck Planner are provided on an "as is" basis. Paycheck Planner makes no warranties, expressed or implied, and hereby disclaims all warranties including merchantability, fitness for a particular purpose, or non-infringement of rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Limitations of Liability</h2>
            <p>
              In no event shall Paycheck Planner or its suppliers be liable for any damages arising out of the use or inability to use the materials, even if Paycheck Planner has been notified of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Accuracy of Materials</h2>
            <p>
              The materials on Paycheck Planner could include technical or typographical errors. Paycheck Planner does not warrant that materials are accurate, complete, or current. Paycheck Planner may make changes to materials at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. External Links</h2>
            <p>
              Paycheck Planner is not responsible for the contents of linked sites. The inclusion of any link does not imply endorsement. Use of linked websites is at the user's own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Modifications</h2>
            <p>
              Paycheck Planner may revise these terms at any time without notice. By using this website, you agree to be bound by the current version of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Governing Law</h2>
            <p>
              These terms are governed by and construed in accordance with the laws of the United States.
            </p>
          </section>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-8">
            <p className="text-yellow-400 text-xs">
              <strong>NOT FINANCIAL ADVICE:</strong> Paycheck Planner provides educational tools only. Please consult a qualified financial professional before making financial decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
