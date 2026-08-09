'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-[#020617]">
      <div className="flex justify-center px-6 py-12">
        <div className="w-full max-w-6xl">
          {/* Get the App - store badge + QR code. Hidden on any phone-width
              screen (Chrome mobile, Safari mobile, the native app -- all of
              them) via a pure CSS breakpoint, since JS-based native-app
              detection wasn't reliably matching what's actually being tested
              against. Only ever shows on desktop/tablet-width web.
              Google Play is live -- badge and QR both link to the real
              listing. The App Store badge stays "coming soon" until iOS is
              actually submitted; swap it for the official "Download on the
              App Store" badge asset (per Apple's brand guidelines) at that
              point. */}
          <div className="mb-12 hidden rounded-2xl border border-gray-800 bg-[#0f172a] p-6 md:block">
            <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
              <div className="text-center md:text-left">
                <h3 className="text-lg font-bold text-white">Get the Paycheck Planner app</h3>
                <p className="mt-1 text-sm text-gray-400">
                  Available now on Google Play. Coming soon to the App Store.
                </p>
                <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row md:items-start">
                  <a href="https://play.google.com/store/apps/details?id=com.dibeasi.paycheckplanner"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-black px-4 py-2 text-sm text-gray-200 transition hover:border-gray-500"
                  >
                    <span className="text-xs text-gray-400">Get it on</span>
                    <span className="font-semibold">Google Play</span>
                  </a>
                  <span
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-black px-4 py-2 text-sm text-gray-200 opacity-70"
                    title="Coming soon to the App Store"
                  >
                    <span className="text-xs text-gray-500">Download on the</span>
                    <span className="font-semibold">App Store</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <a href="https://play.google.com/store/apps/details?id=com.dibeasi.paycheckplanner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-28 w-28 items-center justify-center rounded-lg border border-gray-700 bg-white p-2"
                  title="Scan to get Paycheck Planner on Google Play"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 39 39" shapeRendering="crispEdges" className="h-full w-full"><path fill="#ffffff" d="M0 0h39v39H0z"/><path stroke="#000000" d="M1 1.5h7m3 0h2m6 0h1m1 0h2m1 0h1m1 0h2m1 0h1m1 0h7M1 2.5h1m5 0h1m3 0h3m3 0h4m4 0h4m2 0h1m5 0h1M1 3.5h1m1 0h3m1 0h1m1 0h3m2 0h1m1 0h1m3 0h4m1 0h1m1 0h1m1 0h1m1 0h1m1 0h3m1 0h1M1 4.5h1m1 0h3m1 0h1m1 0h1m3 0h3m1 0h5m1 0h1m2 0h2m3 0h1m1 0h3m1 0h1M1 5.5h1m1 0h3m1 0h1m1 0h2m2 0h4m2 0h3m1 0h2m4 0h1m1 0h1m1 0h3m1 0h1M1 6.5h1m5 0h1m1 0h2m1 0h2m1 0h3m1 0h1m2 0h1m1 0h1m1 0h1m1 0h1m5 0h1M1 7.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M9 8.5h4m1 0h4m2 0h1m2 0h5M2 9.5h1m1 0h1m2 0h1m1 0h1m1 0h1m2 0h4m3 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1M1 10.5h1m1 0h1m3 0h5m4 0h1m4 0h1m1 0h1m2 0h1m1 0h1m1 0h1m1 0h1M2 11.5h1m3 0h4m2 0h4m1 0h1m2 0h1m1 0h1m1 0h1m2 0h1m1 0h1m1 0h1M1 12.5h1m1 0h1m1 0h1m3 0h1m5 0h2m1 0h4m2 0h1m1 0h4m2 0h1M4 13.5h1m1 0h5m1 0h1m1 0h1m1 0h2m1 0h3m1 0h1m1 0h1m5 0h1M1 14.5h1m2 0h1m3 0h2m1 0h5m2 0h1m1 0h1m2 0h1m1 0h2m1 0h2m1 0h1M2 15.5h1m2 0h1m1 0h1m1 0h1m1 0h3m1 0h1m1 0h1m1 0h5m2 0h1m1 0h1m1 0h1m1 0h1M1 16.5h3m1 0h1m1 0h1m1 0h1m1 0h2m2 0h1m1 0h6m1 0h1m1 0h1m1 0h1m2 0h1M2 17.5h4m4 0h1m1 0h1m1 0h4m1 0h3m2 0h1m1 0h1m2 0h1m1 0h1M1 18.5h1m1 0h1m2 0h2m2 0h1m5 0h2m2 0h2m2 0h1m1 0h1m1 0h1m1 0h1m1 0h1"/></svg>
                </a>
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