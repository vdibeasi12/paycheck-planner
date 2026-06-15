'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-[#020617]">
      <div className="flex justify-center px-6 py-12">
        <div className="w-full max-w-6xl">
          {/* Footer Links Grid - Centered */}
          <div className="grid grid-cols-3 gap-16 mb-12">
            {/* Product */}
            <div className="text-center">
              <h3 className="font-bold text-lg mb-4 text-white">Product</h3>
              <div className="space-y-2 text-gray-400 text-sm">
                <p><Link href="/features" className="hover:text-white transition">Features</Link></p>
                <p><Link href="/pricing" className="hover:text-white transition">Pricing</Link></p>
                <p><Link href="/ai-chat" className="hover:text-white transition">AI Chat</Link></p>
              </div>
            </div>

            {/* Legal */}
            <div className="text-center">
              <h3 className="font-bold text-lg mb-4 text-white">Legal</h3>
              <div className="space-y-2 text-gray-400 text-sm">
                <p><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></p>
                <p><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></p>
                <p><Link href="/disclaimer" className="hover:text-white transition">Disclaimer</Link></p>
              </div>
            </div>

            {/* Company */}
            <div className="text-center">
              <h3 className="font-bold text-lg mb-4 text-white">Company</h3>
              <div className="space-y-2 text-gray-400 text-sm">
                <p><Link href="/about" className="hover:text-white transition">About</Link></p>
                <p><Link href="/contact" className="hover:text-white transition">Contact</Link></p>
                <p><Link href="/support" className="hover:text-white transition">Support</Link></p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800 pt-8">
            {/* Disclaimers & Legal Section */}
            <div className="space-y-4 mb-8">
              <div className="text-gray-500 text-xs space-y-4">
                <p>
                  <strong>Legal Disclaimer:</strong> Paycheck Planner is an independent financial management platform and is NOT affiliated with, endorsed by, or associated with Acorns®, Rocket Mortgage®, or any other financial institutions. We provide educational content and planning tools, not financial advice.
                </p>
                
                <p>
                  <strong>Important Notice:</strong> Paycheck Planner does not provide financial, legal, or investment advice. Our tools are for informational and planning purposes only. Always consult with a licensed financial advisor before making major financial decisions. Past performance does not guarantee future results. All financial projections are estimates based on provided inputs and may not reflect actual outcomes.
                </p>

                <p>
                  <strong>Data Security:</strong> Your financial data is encrypted with AES-256 bank-grade security. All information is protected and never shared without explicit consent.
                </p>
              </div>

              {/* Copyright & Legal Ownership */}
              <div className="border-t border-gray-700 pt-6 text-gray-600 text-xs space-y-2 text-center">
                <p>
                  © {new Date().getFullYear()} Paycheck Planner. All rights reserved.
                </p>
                <p>
                  <strong>Legal Operator & Property Owner:</strong> DiBeasi Global Investment LLC. All intellectual property, trademarks, content, technology, and proprietary materials are the exclusive property of DiBeasi Global Investment LLC. Unauthorized use or reproduction is prohibited.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
