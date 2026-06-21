'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-[#020617]">
      <div className="flex justify-center px-6 py-12">
        <div className="w-full max-w-6xl">
          {/* Get the App - store badges + QR placeholder.
              NOTE: swap the two placeholder buttons for the official
              "Download on the App Store" and "Get it on Google Play" badge
              assets (per Apple/Google brand guidelines) once the apps are live,
              and replace the QR box with a real QR linking to the store pages. */}
          <div className="mb-12 rounded-2xl border border-gray-800 bg-[#0f172a] p-6">
            <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
              <div className="text-center md:text-left">
                <h3 className="text-lg font-bold text-white">Get the Paycheck Planner app</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Available on the App Store and Google Play (coming soon).
                </p>
                <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row md:items-start">
                  <span
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-black px-4 py-2 text-sm text-gray-200 opacity-70"
                    title="Coming soon to the App Store"
                  >
                    <span className="text-xs text-gray-500">Download on the</span>
                    <span className="font-semibold">App Store</span>
                  </span>
                  <span
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-black px-4 py-2 text-sm text-gray-200 opacity-70"
                    title="Coming soon to Google Play"
                  >
                    <span className="text-xs text-gray-500">Get it on</span>
                    <span className="font-semibold">Google Play</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-dashed border-gray-700 bg-[#020617] text-center">
                  <span className="px-2 text-xs text-gray-500">QR code at launch</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Scan to download</p>
              </div>
            </div>
          </div>

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
                  <strong>Legal Disclaimer:</strong> Paycheck Planner is an independent financial management platform and is not affiliated with, endorsed by, or associated with any bank, lender, or third-party financial institution. We provide educational content and planning tools, not financial advice.
                </p>

                <p>
                  <strong>Important Notice:</strong> Paycheck Planner does not provide financial, legal, or investment advice. Our tools are for informational and planning purposes only. Always consult with a licensed financial advisor before making major financial decisions. Past performance does not guarantee future results. All financial projections are estimates based on provided inputs and may not reflect actual outcomes.
                </p>

                <p>
                  <strong>Data Security:</strong> Your financial data is protected with encryption in transit and at rest along with access controls. No online service is completely secure, and your information is never shared without your consent except as described in our Privacy Policy.
                </p>
              </div>

              {/* Copyright & Legal Ownership */}
              <div className="border-t border-gray-700 pt-6 text-gray-600 text-xs space-y-2 text-center">
                <p>
                  &copy; {new Date().getFullYear()} Paycheck Planner. All rights reserved.
                </p>
                <p>
                  <strong>Legal Operator &amp; Property Owner:</strong> DiBeasi Global Investments LLC, doing business as "Paycheck Planner". All intellectual property, trademarks, content, technology, and proprietary materials are the exclusive property of DiBeasi Global Investments LLC. Unauthorized use or reproduction is prohibited.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}